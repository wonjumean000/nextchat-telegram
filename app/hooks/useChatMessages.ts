import { useMemo, useState, useCallback } from "react";
import {
  ChatMessage,
  useChatStore,
  useAppConfig,
  createMessage,
  BOT_HELLO,
} from "../store";
import { useAccessStore } from "../store";
import { CHAT_PAGE_SIZE } from "../constant";

type RenderMessage = ChatMessage & { preview?: boolean };

export function useChatMessages(userInput: string, isLoading: boolean) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const accessStore = useAccessStore();

  const context: RenderMessage[] = useMemo(() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  }, [session.mask.context, session.mask.hideContext]);

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!accessStore.isAuthorized()) {
      copiedHello.content = Locale.Error.Unauthorized;
    }
    context.push(copiedHello);
  }

  const renderMessages = useMemo(() => {
    return context
      .concat(session.messages as RenderMessage[])
      .concat(
        isLoading
          ? [
              {
                ...createMessage({
                  role: "assistant",
                  content: "……",
                }),
                preview: true,
              },
            ]
          : [],
      )
      .concat(
        userInput.length > 0 && config.sendPreviewBubble
          ? [
              {
                ...createMessage({
                  role: "user",
                  content: userInput,
                }),
                preview: true,
              },
            ]
          : [],
      );
  }, [
    config.sendPreviewBubble,
    context,
    isLoading,
    session.messages,
    userInput,
  ]);

  const [msgRenderIndex, setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );

  const setMsgRenderIndexBounded = useCallback(
    (newIndex: number) => {
      newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
      newIndex = Math.max(0, newIndex);
      setMsgRenderIndex(newIndex);
    },
    [renderMessages.length],
  );

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const clearContextIndex =
    (session.clearContextIndex ?? -1) >= 0
      ? session.clearContextIndex! + context.length - msgRenderIndex
      : -1;

  return {
    context,
    renderMessages,
    messages,
    msgRenderIndex,
    setMsgRenderIndex: setMsgRenderIndexBounded,
    clearContextIndex,
  };
}

import Locale from "../locales";
