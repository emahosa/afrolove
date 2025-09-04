import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const useClickPop = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleClick = () => {
      gsap.to(element, {
        scale: 0.95,
        yoyo: true,
        repeat: 1,
        duration: 0.1,
        ease: 'power1.inOut',
      });
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }, []);

  return ref;
};
