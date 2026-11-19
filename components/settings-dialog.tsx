"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, testApiConnection } from "@/lib/api-client";
import { MINUTES_MODEL_PRESETS, TRANSCRIBE_MODEL_PRESETS } from "@/lib/constants";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Settings } from "@/lib/types";

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function test() {
    setTesting(true);
    setMessage(null);
    try {
      const result = await testApiConnection(settings);
      setMessage(result);
      toast.success(result);
    } catch (error) {
      const text = error instanceof ApiError ? error.message : "無法測試連線。";
      setMessage(text);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
          <DialogDescription>
            金鑰只寫進這台瀏覽器的 localStorage，不會進專案或資料庫。轉寫請求會經由這個網站轉送到你填的 API，用來避開瀏覽器跨域限制，伺服器不會保存金鑰。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key">OpenAI API 金鑰</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="api-key"
                className="h-10"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                value={settings.apiKey}
                placeholder="sk-..."
                onChange={(event) => onChange({ ...settings, apiKey: event.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10"
                aria-label={showKey ? "隱藏金鑰" : "顯示金鑰"}
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="api-base">API 基底網址</Label>
            <Input
              id="api-base"
              className="mt-1 h-10"
              value={settings.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(event) => onChange({ ...settings, baseUrl: event.target.value })}
            />
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              留白就使用 OpenAI。只填你信任的 HTTPS 服務，金鑰會送到這個網址。
            </p>
          </div>
          <ModelField
            id="transcribe-model"
            label="轉寫模型"
            value={settings.transcribeModel}
            presets={TRANSCRIBE_MODEL_PRESETS}
            onChange={(transcribeModel) => onChange({ ...settings, transcribeModel })}
          />
          <ModelField
            id="minutes-model"
            label="會議紀錄模型"
            value={settings.minutesModel}
            presets={MINUTES_MODEL_PRESETS}
            onChange={(minutesModel) => onChange({ ...settings, minutesModel })}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            含 diarize 的轉寫模型會盡量標出講者。whisper-1 會回傳時間戳。其他模型若支援段落時間戳也會保留。
          </p>
          {message ? (
            <p role="status" className="text-sm leading-6">
              {message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              className="h-10"
              onClick={() => {
                onChange({ ...DEFAULT_SETTINGS });
                setMessage("已清除這台瀏覽器裡的金鑰與模型設定。");
              }}
            >
              清除設定
            </Button>
            <Button className="h-10" onClick={() => void test()} disabled={testing}>
              {testing ? <Loader2 className="animate-spin" /> : null}
              測試連線
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelField({
  id,
  label,
  value,
  presets,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  presets: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="mt-1 h-10"
        list={`${id}-presets`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={`${id}-presets`}>
        {presets.map((preset) => (
          <option key={preset} value={preset} />
        ))}
      </datalist>
    </div>
  );
}
