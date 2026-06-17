"use client";

import React, { Fragment } from "react";
import { ChatMessage, useChatStore, useAppConfig } from "../store";
import {
  getMessageTextContent,
  getMessageImages,
  copyToClipboard,
} from "../utils";
import { useMobileScreen } from "../utils";
import { Avatar } from "./emoji";
import { MaskAvatar } from "./mask";
import { IconButton } from "./button";
import { ChatAction } from "./chat";
import dynamic from "next/dynamic";
import Locale from "../locales";
import styles from "./chat.module.scss";

import EditIcon from "../icons/rename.svg";
import CopyIcon from "../icons/copy.svg";
import ResetIcon from "../icons/reload.svg";
import StopIcon from "../icons/pause.svg";
import DeleteIcon from "../icons/clear.svg";
import PinIcon from "../icons/pin.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CloseIcon from "../icons/close.svg";
import LoadingButtonIcon from "../icons/loading.svg";

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <div>Loading...</div>,
});

interface ChatMessageItemProps {
  message: ChatMessage & { preview?: boolean };
  index: number;
  isContext: boolean;
  showActions: boolean;
  showTyping: boolean;
  shouldShowClearContextDivider: boolean;
  messages: (ChatMessage & { preview?: boolean })[];
  onUserStop: (messageId: string) => void;
  onResend: (message: ChatMessage) => void;
  onDelete: (msgId: string) => void;
  onPinMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  setUserInput: (input: string) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

export function ChatMessageItem({
  message,
  index,
  isContext,
  showActions,
  showTyping,
  shouldShowClearContextDivider,
  messages,
  onUserStop,
  onResend,
  onDelete,
  onPinMessage,
  onEditMessage,
  setUserInput,
  scrollRef,
}: ChatMessageItemProps) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const isMobile = useMobileScreen();
  const isUser = message.role === "user";

  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;

  return (
    <Fragment key={message.id}>
      <div
        className={
          isUser ? styles["chat-message-user"] : styles["chat-message"]
        }
      >
        <div className={styles["chat-message-container"]}>
          <div className={styles["chat-message-header"]}>
            <div className={styles["chat-message-avatar"]}>
              <div className={styles["chat-message-edit"]}>
                <IconButton
                  icon={<EditIcon />}
                  aria={Locale.Chat.Actions.Edit}
                  onClick={() => onEditMessage(message)}
                />
              </div>
              {isUser ? (
                <Avatar avatar={config.avatar} />
              ) : (
                <>
                  {["system"].includes(message.role) ? (
                    <Avatar avatar="2699-fe0f" />
                  ) : (
                    <MaskAvatar
                      avatar={session.mask.avatar}
                      model={message.model || session.mask.modelConfig.model}
                    />
                  )}
                </>
              )}
            </div>
            {!isUser && (
              <div className={styles["chat-model-name"]}>{message.model}</div>
            )}

            {showActions && (
              <div className={styles["chat-message-actions"]}>
                <div className={styles["chat-input-actions"]}>
                  {message.streaming ? (
                    <ChatAction
                      text={Locale.Chat.Actions.Stop}
                      icon={<StopIcon />}
                      onClick={() => onUserStop(message.id ?? index)}
                    />
                  ) : (
                    <>
                      <ChatAction
                        text={Locale.Chat.Actions.Retry}
                        icon={<ResetIcon />}
                        onClick={() => onResend(message)}
                      />
                      <ChatAction
                        text={Locale.Chat.Actions.Delete}
                        icon={<DeleteIcon />}
                        onClick={() => onDelete(message.id ?? index)}
                      />
                      <ChatAction
                        text={Locale.Chat.Actions.Pin}
                        icon={<PinIcon />}
                        onClick={() => onPinMessage(message)}
                      />
                      <ChatAction
                        text={Locale.Chat.Actions.Copy}
                        icon={<CopyIcon />}
                        onClick={() =>
                          copyToClipboard(getMessageTextContent(message))
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {message?.tools?.length == 0 && showTyping && (
            <div className={styles["chat-message-status"]}>
              {Locale.Chat.Typing}
            </div>
          )}
          {message?.tools?.length > 0 && (
            <div className={styles["chat-message-tools"]}>
              {message?.tools?.map((tool) => (
                <div
                  key={tool.id}
                  title={tool?.errorMsg}
                  className={styles["chat-message-tool"]}
                >
                  {tool.isError === false ? (
                    <ConfirmIcon />
                  ) : tool.isError === true ? (
                    <CloseIcon />
                  ) : (
                    <LoadingButtonIcon />
                  )}
                  <span>{tool?.function?.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className={styles["chat-message-item"]}>
            <Markdown
              key={message.streaming ? "loading" : "done"}
              content={getMessageTextContent(message)}
              loading={
                (message.preview || message.streaming) &&
                message.content.length === 0 &&
                !isUser
              }
              onDoubleClickCapture={() => {
                if (!isMobile) return;
                setUserInput(getMessageTextContent(message));
              }}
              fontSize={fontSize}
              fontFamily={fontFamily}
              parentRef={scrollRef}
              defaultShow={index >= messages.length - 6}
            />
            {getMessageImages(message).length == 1 && (
              <img
                className={styles["chat-message-item-image"]}
                src={getMessageImages(message)[0]}
                alt=""
              />
            )}
            {getMessageImages(message).length > 1 && (
              <div
                className={styles["chat-message-item-images"]}
                style={
                  {
                    "--image-count": getMessageImages(message).length,
                  } as React.CSSProperties
                }
              >
                {getMessageImages(message).map((image, imgIndex) => (
                  <img
                    className={styles["chat-message-item-image-multi"]}
                    key={imgIndex}
                    src={image}
                    alt=""
                  />
                ))}
              </div>
            )}
            {message?.audio_url && (
              <div className={styles["chat-message-audio"]}>
                <audio src={message.audio_url} controls />
              </div>
            )}
            <div className={styles["chat-message-action-date"]}>
              {isContext
                ? Locale.Chat.IsContext
                : message.date.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
