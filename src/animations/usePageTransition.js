import { useLayoutEffect } from 'react';
import gsap from 'gsap';

export function usePageTransition(ref) {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: 'power2.out',
      });
    });
    return () => ctx.revert();
  }, []);
}
