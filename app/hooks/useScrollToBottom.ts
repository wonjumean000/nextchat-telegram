import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage } from "../store";

export function useScrollToBottom(
  scrollRef: RefObject<HTMLDivElement>,
  detach: boolean = false,
  messages: ChatMessage[],
) {
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollDomToBottom = useCallback(() => {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }, [scrollRef]);

  useEffect(() => {
    if (autoScroll && !detach) {
      scrollDomToBottom();
    }
  });

  const lastMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastMessagesLength.current && !detach) {
      scrollDomToBottom();
    }
    lastMessagesLength.current = messages.length;
  }, [messages.length, detach, scrollDomToBottom]);

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}
