# Media Session API — экран блокировки Android

## Context

PWA-аудиоплеер не интегрирован с системными медиа-контролями Android. На экране блокировки и в шторке уведомлений нет кнопок управления воспроизведением. Media Session API позволяет это исправить — Chrome/Edge на Android полностью поддерживают его.

## Дизайн

### Новый хук: `src/hooks/useMediaSession.ts`

Инкапсулирует всю логику Media Session API. Вызывается из App.tsx одной строкой.

**Сигнатура:**
```typescript
function useMediaSession(options: {
  track: Track | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
}): void
```

**Что делает хук:**

1. **Metadata** — при смене трека устанавливает `navigator.mediaSession.metadata = new MediaMetadata({ title: track.name })`. Без артиста и обложки (по решению пользователя).

2. **Action handlers** — регистрирует обработчики: `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`. Вызывают переданные коллбэки.

3. **Position state** — при изменении `duration` или `currentTime` вызывает `navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: currentTime })`. Это даёт прогресс-бар на экране блокировки.

4. **Cleanup** — при размонтировании или смене трека сбрасывает metadata и удаляет обработчики.

**Guard:** ранний возврат если `!('mediaSession' in navigator)` — API может быть недоступно.

### Изменения в `src/components/App.tsx`

Добавить вызов хука:
```typescript
useMediaSession({
  track: playlist.currentTrack,
  isPlaying: audio.state.isPlaying,
  duration: audio.state.duration,
  currentTime: audio.state.currentTime,
  onPlay: () => audio.play(),
  onPause: () => audio.pause(),
  onNext: () => { const t = playlist.next(); if (t) loadAndPlay(t); },
  onPrevious: () => { const t = playlist.prev(); if (t) loadAndPlay(t); },
  onSeek: (time) => audio.seek(time),
});
```

### Файлы

- **Создать:** `src/hooks/useMediaSession.ts`
- **Изменить:** `src/components/App.tsx` — добавить вызов хука

## Верификация

1. `npm run build` — без ошибок типов
2. `npm test` — все тесты проходят
3. `npm run lint:fix && npm run format` — без проблем
4. Ручная проверка: открыть PWA на Android (Chrome), начать воспроизведение, заблокировать экран — должны быть видны кнопки play/pause/next/prev и название трека
