import React from 'react';
import type { StripeElement } from '@stripe/stripe-js';

type EventCallback = (...args: unknown[]) => void;

export const useAttachEvent = (
  element: StripeElement | null,
  event: string,
  cb?: EventCallback
) => {
  const cbDefined = !!cb;
  const cbRef = React.useRef(cb);

  // In many integrations the callback prop changes on each render.
  // Using a ref saves us from calling element.on/.off every render.
  React.useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  React.useEffect(() => {
    if (!cbDefined || !element) {
      return () => { /* no-op */ };
    }

    const decoratedCb: EventCallback = (...args: unknown[]): void => {
      if (cbRef.current) {
        cbRef.current(...args);
      }
    };

    (element as StripeElement & { on: (event: string, cb: EventCallback) => void }).on(event, decoratedCb);

    return () => {
      (element as StripeElement & { off: (event: string, cb: EventCallback) => void }).off(event, decoratedCb);
    };
  }, [cbDefined, event, element, cbRef]);
};