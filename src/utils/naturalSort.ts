export function naturalCompare(a: string, b: string): number {
  const ax = a.split(/(\d+)/);
  const bx = b.split(/(\d+)/);

  for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
    const aPart = ax[i];
    const bPart = bx[i];
    if (i % 2 === 0) {
      const cmp = aPart.localeCompare(bPart);
      if (cmp !== 0) return cmp;
    } else {
      const aNum = Number(aPart);
      const bNum = Number(bPart);
      if (aNum !== bNum) return aNum - bNum;
    }
  }
  return ax.length - bx.length;
}
