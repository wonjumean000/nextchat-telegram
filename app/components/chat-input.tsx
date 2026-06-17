"use client";

import React, { useRef, useState } from "react";
import { useAppConfig } from "../store";
import { useMobileScreen } from "../utils";
import { autoGrowTextArea } from "../utils";
import { useDebouncedCallback } from "use-debounce";
import { IconButton } from "./button";
import { ChatActions, RenderPrompt } from "./chat";
import Locale from "../locales";
import styles from "./chat.module.scss";
import clsx from "clsx";

import SendWhiteIcon from "../icons/send-white.svg";
import DeleteIcon from "../icons/clear.svg";

interface ChatInputProps {
  userInput: string;
  setUserInput: (input: string) => void;
  onSubmit: (input: string) => void;
  onInput: (text: string) => void;
  promptHints: RenderPrompt[];
  onPromptSelect: (prompt: RenderPrompt) => void;
  onShowPromptHints: () => void;
  attachImages: string[];
  setAttachImages: (images: string[]) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  uploadImage: () => void;
  scrollToBottom: () => void;
  showPromptModal: boolean;
  setShowPromptModal: (show: boolean) => void;
  setShowShortcutKeyModal: (show: boolean) => void;
  setShowChatSidePanel: (show: boolean) => void;
  showChatSidePanel: boolean;
}

export function ChatInput({
  userInput,
  setUserInput,
  onSubmit,
  onInput,
  promptHints,
  onPromptSelect,
  onShowPromptHints,
  attachImages,
  setAttachImages,
  uploading,
  setUploading,
  uploadImage,
  scrollToBottom,
  showPromptModal,
  setShowPromptModal,
  setShowShortcutKeyModal,
  setShowChatSidePanel,
  showChatSidePanel,
}: ChatInputProps) {
  const config = useAppConfig();
  const isMobile = useMobileScreen();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputRows, setInputRows] = useState(2);

  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(20, Math.max(2 + Number(!isMobile), rows));
      setInputRows(inputRows);
    },
    100,
    { leading: true, trailing: true },
  );

  const handleInput = (text: string) => {
    onInput(text);
    measure();
  };

  const handlePaste = async (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const items = (event.clipboardData || window.clipboardData).items;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const images: string[] = [...attachImages];
          setUploading(true);
          try {
            const { uploadImage } = await import("@/app/utils/chat");
            const dataUrl = await uploadImage(file);
            images.push(dataUrl);
            if (images.length > 3) {
              images.splice(3, images.length - 3);
            }
            setAttachImages(images);
          } catch (e) {
            console.error("Upload failed:", e);
          } finally {
            setUploading(false);
          }
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onSubmit(userInput);
    }
  };

  return (
    <div className={styles["chat-input-panel"]}>
      <div className={styles["prompt-hints"]}>
        {promptHints.map((prompt, i) => (
          <div
            key={prompt.title}
            className={styles["prompt-hint"]}
            onClick={() => onPromptSelect(prompt)}
          >
            <div className={styles["hint-title"]}>{prompt.title}</div>
            <div className={styles["hint-content"]}>{prompt.content}</div>
          </div>
        ))}
      </div>

      <ChatActions
        uploadImage={uploadImage}
        setAttachImages={setAttachImages}
        setUploading={setUploading}
        showPromptModal={() => setShowPromptModal(true)}
        scrollToBottom={scrollToBottom}
        hitBottom={true}
        uploading={uploading}
        showPromptHints={onShowPromptHints}
        setShowShortcutKeyModal={setShowShortcutKeyModal}
        setUserInput={setUserInput}
        setShowChatSidePanel={setShowChatSidePanel}
      />

      <label
        className={clsx(styles["chat-input-panel-inner"], {
          [styles["chat-input-panel-inner-attach"]]: attachImages.length !== 0,
        })}
        htmlFor="chat-input"
      >
        <textarea
          id="chat-input"
          ref={inputRef}
          className={styles["chat-input"]}
          placeholder={Locale.Chat.Input("Enter")}
          onInput={(e) => handleInput(e.currentTarget.value)}
          value={userInput}
          onKeyDown={handleKeyDown}
          onFocus={scrollToBottom}
          onClick={scrollToBottom}
          onPaste={handlePaste}
          rows={inputRows}
          autoFocus={!isMobile}
          style={{
            fontSize: config.fontSize,
            fontFamily: config.fontFamily,
          }}
        />
        {attachImages.length != 0 && (
          <div className={styles["attach-images"]}>
            {attachImages.map((image, index) => (
              <div
                key={index}
                className={styles["attach-image"]}
                style={{ backgroundImage: `url("${image}")` }}
              >
                <div className={styles["attach-image-mask"]}>
                  <div
                    className={styles["delete-image"]}
                    onClick={() =>
                      setAttachImages(
                        attachImages.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <DeleteIcon />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <IconButton
          icon={<SendWhiteIcon />}
          text={Locale.Chat.Send}
          className={styles["chat-input-send"]}
          type="primary"
          onClick={() => onSubmit(userInput)}
        />
      </label>
    </div>
  );
}
