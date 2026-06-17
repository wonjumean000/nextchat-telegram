"use client";

import React from "react";
import { useChatStore, useAppConfig, DEFAULT_TOPIC } from "../store";
import { useMobileScreen } from "../utils";
import { IconButton } from "./button";
import { PromptToast } from "./chat";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import Locale from "../locales";
import styles from "./chat.module.scss";
import clsx from "clsx";

import ReturnIcon from "../icons/return.svg";
import RenameIcon from "../icons/rename.svg";
import ExportIcon from "../icons/share.svg";
import ReloadIcon from "../icons/reload.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import { showToast } from "./ui-lib";
import { getClientConfig } from "../config/client";

interface ChatHeaderProps {
  setIsEditingMessage: (show: boolean) => void;
  setShowExport: (show: boolean) => void;
  showPromptModal: boolean;
  setShowPromptModal: (show: boolean) => void;
  hitBottom: boolean;
}

export function ChatHeader({
  setIsEditingMessage,
  setShowExport,
  showPromptModal,
  setShowPromptModal,
  hitBottom,
}: ChatHeaderProps) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const navigate = useNavigate();
  const isMobile = useMobileScreen();
  const clientConfig = getClientConfig();
  const showMaxIcon = !isMobile && !clientConfig?.isApp;

  return (
    <div className="window-header" data-tauri-drag-region>
      {isMobile && (
        <div className="window-actions">
          <div className={"window-action-button"}>
            <IconButton
              icon={<ReturnIcon />}
              bordered
              title={Locale.Chat.Actions.ChatList}
              onClick={() => navigate(Path.Home)}
            />
          </div>
        </div>
      )}

      <div className={clsx("window-header-title", styles["chat-body-title"])}>
        <div
          className={clsx(
            "window-header-main-title",
            styles["chat-body-main-title"],
          )}
          onClickCapture={() => setIsEditingMessage(true)}
        >
          {!session.topic ? DEFAULT_TOPIC : session.topic}
        </div>
        <div className="window-header-sub-title">
          {Locale.Chat.SubTitle(session.messages.length)}
        </div>
      </div>

      <div className="window-actions">
        <div className="window-action-button">
          <IconButton
            icon={<ReloadIcon />}
            bordered
            title={Locale.Chat.Actions.RefreshTitle}
            onClick={() => {
              showToast(Locale.Chat.Actions.RefreshToast);
              chatStore.summarizeSession(true, session);
            }}
          />
        </div>
        {!isMobile && (
          <div className="window-action-button">
            <IconButton
              icon={<RenameIcon />}
              bordered
              title={Locale.Chat.EditMessage.Title}
              aria={Locale.Chat.EditMessage.Title}
              onClick={() => setIsEditingMessage(true)}
            />
          </div>
        )}
        <div className="window-action-button">
          <IconButton
            icon={<ExportIcon />}
            bordered
            title={Locale.Chat.Actions.Export}
            onClick={() => setShowExport(true)}
          />
        </div>
        {showMaxIcon && (
          <div className="window-action-button">
            <IconButton
              icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
              bordered
              title={Locale.Chat.Actions.FullScreen}
              aria={Locale.Chat.Actions.FullScreen}
              onClick={() => {
                config.update(
                  (config) => (config.tightBorder = !config.tightBorder),
                );
              }}
            />
          </div>
        )}
      </div>

      <PromptToast
        showToast={!hitBottom}
        showModal={showPromptModal}
        setShowModal={setShowPromptModal}
      />
    </div>
  );
}
