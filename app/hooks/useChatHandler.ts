import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ChatMessage, useChatStore, useAppConfig } from "../store";
import { usePromptStore, Prompt } from "../store/prompt";
import { useAccessStore } from "../store";
import { ChatCommandPrefix, useChatCommand, useCommand } from "../command";
import { ChatControllerPool } from "../client/controller";
import { REQUEST_TIMEOUT_MS, UNFINISHED_INPUT, Path } from "../constant";
import { prettyObject } from "../utils/format";
import {
  getMessageTextContent,
  getMessageImages,
  selectOrCopy,
} from "../utils";
import { useNavigate } from "react-router-dom";
import { isEmpty } from "lodash-es";

export type RenderPrompt = Pick<Prompt, "title" | "content">;
type RenderMessage = ChatMessage & { preview?: boolean };

export function useChatHandler(inputRef: React.RefObject<HTMLTextAreaElement>) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const navigate = useNavigate();

  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);
  const [showChatSidePanel, setShowChatSidePanel] = useState(false);

  const promptStore = usePromptStore();
  const [promptHints, setPromptHints] = useState<RenderPrompt[]>([]);

  const accessStore = useAccessStore();

  const SEARCH_TEXT_LIMIT = 30;

  const chatCommands = useChatCommand({
    new: () => chatStore.newSession(),
    newm: () => navigate(Path.NewChat),
    prev: () => chatStore.nextSession(-1),
    next: () => chatStore.nextSession(1),
    clear: () =>
      chatStore.updateTargetSession(
        session,
        (session) => (session.clearContextIndex = session.messages.length),
      ),
    fork: () => chatStore.forkSession(),
    del: () => chatStore.deleteSession(chatStore.currentSessionIndex),
  });

  const onSearch = useDebouncedCallback(
    (text: string) => {
      const matchedPrompts = promptStore.search(text);
      setPromptHints(matchedPrompts);
    },
    100,
    { leading: true, trailing: true },
  );

  const onInput = useCallback(
    (text: string) => {
      setUserInput(text);
      const n = text.trim().length;

      if (n === 0) {
        setPromptHints([]);
      } else if (text.match(ChatCommandPrefix)) {
        setPromptHints(chatCommands.search(text));
      } else if (!config.disablePromptHint && n < SEARCH_TEXT_LIMIT) {
        if (text.startsWith("/")) {
          let searchText = text.slice(1);
          onSearch(searchText);
        }
      }
    },
    [config.disablePromptHint, chatCommands, onSearch],
  );

  const doSubmit = useCallback(
    (userInput: string) => {
      if (userInput.trim() === "" && isEmpty(attachImages)) return;
      const matchCommand = chatCommands.match(userInput);
      if (matchCommand.matched) {
        setUserInput("");
        setPromptHints([]);
        matchCommand.invoke();
        return;
      }
      setIsLoading(true);
      chatStore
        .onUserInput(userInput, attachImages)
        .then(() => setIsLoading(false));
      setAttachImages([]);
      chatStore.setLastInput(userInput);
      setUserInput("");
      setPromptHints([]);
      if (!isMobileScreen()) inputRef.current?.focus();
    },
    [attachImages, chatCommands, chatStore, inputRef],
  );

  const onPromptSelect = useCallback(
    (prompt: RenderPrompt) => {
      setTimeout(() => {
        setPromptHints([]);

        const matchedChatCommand = chatCommands.match(prompt.content);
        if (matchedChatCommand.matched) {
          matchedChatCommand.invoke();
          setUserInput("");
        } else {
          setUserInput(prompt.content);
        }
        inputRef.current?.focus();
      }, 30);
    },
    [chatCommands, inputRef],
  );

  const onUserStop = useCallback(
    (messageId: string) => {
      ChatControllerPool.stop(session.id, messageId);
    },
    [session.id],
  );

  const deleteMessage = useCallback(
    (msgId?: string) => {
      chatStore.updateTargetSession(
        session,
        (session) =>
          (session.messages = session.messages.filter((m) => m.id !== msgId)),
      );
    },
    [chatStore, session],
  );

  const onDelete = useCallback(
    (msgId: string) => {
      deleteMessage(msgId);
    },
    [deleteMessage],
  );

  const onResend = useCallback(
    (message: ChatMessage) => {
      const resendingIndex = session.messages.findIndex(
        (m) => m.id === message.id,
      );

      if (resendingIndex < 0 || resendingIndex >= session.messages.length) {
        return;
      }

      let userMessage: ChatMessage | undefined;
      let botMessage: ChatMessage | undefined;

      if (message.role === "assistant") {
        botMessage = message;
        for (let i = resendingIndex; i >= 0; i -= 1) {
          if (session.messages[i].role === "user") {
            userMessage = session.messages[i];
            break;
          }
        }
      } else if (message.role === "user") {
        userMessage = message;
        for (let i = resendingIndex; i < session.messages.length; i += 1) {
          if (session.messages[i].role === "assistant") {
            botMessage = session.messages[i];
            break;
          }
        }
      }

      if (userMessage === undefined) return;

      deleteMessage(userMessage.id);
      deleteMessage(botMessage?.id);

      setIsLoading(true);
      const textContent = getMessageTextContent(userMessage);
      const images = getMessageImages(userMessage);
      chatStore
        .onUserInput(textContent, images)
        .then(() => setIsLoading(false));
      inputRef.current?.focus();
    },
    [session.messages, deleteMessage, chatStore, inputRef],
  );

  const onPinMessage = useCallback(
    (message: ChatMessage) => {
      chatStore.updateTargetSession(session, (session) =>
        session.mask.context.push(message),
      );
    },
    [chatStore, session],
  );

  const onRightClick = useCallback(
    (e: any, message: ChatMessage) => {
      if (selectOrCopy(e.currentTarget, getMessageTextContent(message))) {
        if (userInput.length === 0) {
          setUserInput(getMessageTextContent(message));
        }
        e.preventDefault();
      }
    },
    [userInput],
  );

  useCommand({
    fill: setUserInput,
    submit: (text) => {
      doSubmit(text);
    },
    code: (text) => {
      if (accessStore.disableFastLink) return;
      showConfirm(Locale.URLCommand.Code + `code = ${text}`).then((res) => {
        if (res) {
          accessStore.update((access) => (access.accessCode = text));
        }
      });
    },
    settings: (text) => {
      if (accessStore.disableFastLink) return;
      try {
        const payload = JSON.parse(text) as { key?: string; url?: string };
        if (payload.key || payload.url) {
          showConfirm(
            Locale.URLCommand.Settings +
              `\n${JSON.stringify(payload, null, 4)}`,
          ).then((res) => {
            if (!res) return;
            if (payload.key) {
              accessStore.update(
                (access) => (access.openaiApiKey = payload.key!),
              );
            }
            if (payload.url) {
              accessStore.update((access) => (access.openaiUrl = payload.url!));
            }
            accessStore.update((access) => (access.useCustomConfig = true));
          });
        }
      } catch {
        console.error("[Command] failed to get settings from url: ", text);
      }
    },
  });

  useEffect(() => {
    chatStore.updateTargetSession(session, (session) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      session.messages.forEach((m) => {
        if (m.isError || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }
          if (m.content.length === 0) {
            m.isError = true;
            m.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });

      if (session.mask.syncGlobalConfig) {
        session.mask.modelConfig = { ...config.modelConfig };
      }
    });
  }, [session, config.modelConfig, chatStore]);

  useEffect(() => {
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }
  }, [session.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userInput) {
        localStorage.setItem(UNFINISHED_INPUT(session.id), userInput);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [userInput, session.id]);

  return {
    userInput,
    setUserInput,
    isLoading,
    setIsLoading,
    attachImages,
    setAttachImages,
    showExport,
    setShowExport,
    showPromptModal,
    setShowPromptModal,
    isEditingMessage,
    setIsEditingMessage,
    showShortcutKeyModal,
    setShowShortcutKeyModal,
    showChatSidePanel,
    setShowChatSidePanel,
    promptHints,
    setPromptHints,
    onInput,
    doSubmit,
    onPromptSelect,
    onUserStop,
    onDelete,
    onResend,
    onPinMessage,
    onRightClick,
  };
}

function isMobileScreen() {
  return typeof window !== "undefined" && window.innerWidth < 600;
}

function showConfirm(text: string): Promise<boolean> {
  return Promise.resolve(window.confirm(text));
}

import Locale from "../locales";
