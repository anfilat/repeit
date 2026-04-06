# Media Session API: исследование проблемы интеграции с Chrome на macOS

## Контекст

Приложение использует Web Audio API (`AudioBufferSourceNode` → `AudioContext.destination`) для воспроизведения аудио. Media Session API (`navigator.mediaSession`) нужен для отображения контролов в системном трее (macOS Control Center) и на экране блокировки (Android).

**Проблема:** Chrome на macOS связывает Media Session с `<audio>`/`<video>` элементами, а не с Web Audio API. Без `<audio>` элемента Chrome не может корректно отслеживать состояние воспроизведения.

## Поведение Chrome на macOS

- Chrome показывает медиа-контрол в Control Center (трей) только когда обнаруживает активное воспроизведение
- Для обнаружения Chrome использует **фактический аудиовыход**, а не `MediaSession.playbackState`
- В тихих фрагментах музыки Chrome кратковременно показывает «не исполняется» (мигание)
- `MediaSession.playbackState` и `setPositionState` не полностью контролируют отображение — Chrome может их игнорировать

## Перепробованные варианты

### Вариант 1: Только Media Session API (текущий)

Только `navigator.mediaSession` свойства и обработчики действий, без `<audio>` элемента.

```
AudioBufferSourceNode → ctx.destination (колонки)
navigator.mediaSession.metadata / .playbackState / .setActionHandler()
```

**Результат:**
- Контрол в трее появляется при воспроизведении
- Мигание во время тихих фрагментов музыки
- Кнопка play в трее не работает после pause (Chrome не вызывает обработчик действия)
- На Android, скорее всего, работает корректно (Chrome Android лучше интегрирует Media Session с Web Audio)

**Почему не работает полностью:** Chrome macOS детектирует аудиовыход для определения состояния воспроизведения. Когда звук затихает, Chrome считает что воспроизведение остановлено и деактивирует сессию.

### Вариант 2: Silent `<audio>` (data URL, 0 samples) + loop

Создание скрытого `<audio>` элемента с беззвучным WAV (0 сэмплов) в data URL, зацикленного на повтор. Синхронизация play/pause с состоянием приложения.

```
AudioBufferSourceNode → ctx.destination (колонки)
<audio src="data:audio/wav;base64,..." loop> → не выводит звук
```

**Результат:**
- Контрол появляется
- Мигание стало реже, но не пропало
- Кнопка play не работает
- **Перегрузка процессора** — 0-сэмпловый WAV на loop крутится ~44100 раз/сек

**Почему не работает:**
- Chrome не считает беззвучный `<audio>` за реальное медиа
- После приостановки (pause) Chrome деактивирует сессию, обработчик действия `play` больше не вызывается
- 0-сэмпловый WAV вызывает перегрузку из-за постоянного перезапуска loop

### Вариант 3: Silent `<audio>` (0 samples) + никогда не останавливать

Тот же 0-сэмпловый WAV, но `<audio>` никогда не приостанавливается (даже когда Web Audio на паузе). `ms.playbackState` управляет отображаемым состоянием.

**Результат:**
- Мигание прошло
- Кнопка play не работает (появляется ли она — не проверено)
- Перегрузка процессора сохраняется

**Почему не работает:** Перегрузка CPU делает вариант непригодным. Play-кнопка скорее всего тоже не работает — Chrome не отслеживает `<audio>` без реального аудиовыхода.

### Вариант 4: `MediaStreamAudioDestinationNode` + `<audio>` muted

Роутинг аудиопотока из Web Audio через `MediaStreamAudioDestinationNode` в `<audio>` элемент. `<audio>` muted (звук идёт через ctx.destination). Синхронизация play/pause `<audio>` с `isPlaying`.

```
AudioBufferSourceNode → ctx.destination (колонки)
AudioBufferSourceNode → MediaStreamDestinationNode → MediaStream
<audio srcObject=stream muted> → для отслеживания Chrome
```

**Результат:**
- Контрол появляется и не мигает
- Кнопка play не работает
- Контрол пропадает при смене трека

**Почему не работает:**
- Chrome не отслеживает **muted** `<audio>` элементы как активное медиа
- При смене трека `isPlaying` кратковременно `false` → `<audio>` приостанавливается → Chrome удаляет контрол
- Play после pause: Chrome не может возобновить muted `<audio>` → обработчик не вызывается

### Вариант 5: `MediaStreamAudioDestinationNode` + `<audio>` unmuted, без ctx.destination

Весь аудиопоток идёт только через `MediaStreamAudioDestinationNode` → `MediaStream` → `<audio>`. Без подключения к `ctx.destination`. `<audio>` не muted. Никогда не приостанавливается.

```
AudioBufferSourceNode → MediaStreamDestinationNode → MediaStream
<audio srcObject=stream> → колонки + для отслеживания Chrome
```

**Результат:**
- Контрол в трее **вообще не появился**

**Почему не работает:**
- `MediaStreamAudioDestinationNode.stream` при первом создании может не содержать активных аудиотреков (пока source не подключен)
- `<audio>` элемент может не получить `play()` без жеста пользователя (autoplay policy)
- Комбинация этих факторов приводит к тому, что Chrome вообще не видит активное медиа

## Выводы

1. **Chrome macOS требует `<audio>`/`<video>` элемент с реальным аудиовыходом** для полноценной работы Media Session. Web Audio API сам по себе не даёт полного контроля.

2. **Muted `<audio>` не работает** — Chrome игнорирует его для Media Session.

3. **`MediaStreamAudioDestinationNode`** теоретически правильный подход, но на практике:
   - `audio.play()` может быть заблокирован autoplay policy без явного жеста пользователя
   - Двойной аудиовыход (ctx.destination + `<audio>`) создаёт эхо
   - Убирание ctx.destination ломает воспроизведение если `<audio>` не стартовал

4. **Android** вероятно работает лучше — Chrome Android historically лучше интегрирует Media Session с Web Audio API. Нужно тестировать на реальном устройстве.

## Возможные пути дальше

1. **Тест на Android** — текущий Вариант 1 (только Media Session API) может работать на Android без проблем. Android Chrome обрабатывает Media Session иначе.

2. **`MediaStreamAudioDestinationNode` + user gesture** — инициализировать `<audio>` элемент по клику пользователя, потом не останавливать. Требует аккуратной работы с autoplay policy.

3. **Переход на `<audio>` элемент** — вместо Web Audio API использовать `<audio>` элемент для воспроизведения файлов. Это даст нативную интеграцию с Media Session, но потребует значительной переработки архитектуры (сейчас используется `decodeAudioData` + `AudioBufferSourceNode`).

4. **Ждать улучшений в Chrome** — Chrome улучшает интеграцию Web Audio API с Media Session. Отслеживать обновления.
