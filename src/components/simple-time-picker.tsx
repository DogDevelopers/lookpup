"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Clock, ChevronDownIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  format,
  parse,
  setHours,
  startOfHour,
  endOfHour,
  setMinutes,
  startOfMinute,
  endOfMinute,
  startOfDay,
  endOfDay,
  addHours,
  subHours,
  setMilliseconds,
} from "date-fns";

interface SimpleTimeOption {
  value: number;
  label: string;
  disabled?: boolean;
}

const AM_VALUE = 0;
const PM_VALUE = 1;

/**
 * Shadcn Simple Time Picker — compact dropdown time picker for shadcn/ui.
 *
 * Live demo: https://shadcn-datetime-picker-pro.vercel.app/
 * Source:    https://github.com/huybuidac/shadcn-datetime-picker
 *
 * MIT licensed — feel free to copy, modify, and ship.
 */
export function SimpleTimePicker({
  value,
  onChange,
  use12HourFormat,
  min,
  max,
  disabled,
  modal,
}: {
  use12HourFormat?: boolean;
  value: Date;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  className?: string;
  modal?: boolean;
}) {
  const formatStr = useMemo(
    () =>
      use12HourFormat
        ? "yyyy-MM-dd hh:mm.SSS a xxxx"
        : "yyyy-MM-dd HH:mm.SSS xxxx",
    [use12HourFormat],
  );
  const [ampm, setAmpm] = useState(
    format(value, "a") === "AM" ? AM_VALUE : PM_VALUE,
  );
  const [hour, setHour] = useState(
    use12HourFormat ? +format(value, "hh") : value.getHours(),
  );
  const [minute, setMinute] = useState(value.getMinutes());

  const [prevValueTime, setPrevValueTime] = useState(value.getTime());
  const [prevUse12HourFormat, setPrevUse12HourFormat] =
    useState(use12HourFormat);
  if (
    value.getTime() !== prevValueTime ||
    use12HourFormat !== prevUse12HourFormat
  ) {
    setPrevValueTime(value.getTime());
    setPrevUse12HourFormat(use12HourFormat);
    setAmpm(format(value, "a") === "AM" ? AM_VALUE : PM_VALUE);
    setHour(use12HourFormat ? +format(value, "hh") : value.getHours());
    setMinute(value.getMinutes());
  }

  const _hourIn24h = useMemo(() => {
    return use12HourFormat ? (hour % 12) + ampm * 12 : hour;
  }, [hour, use12HourFormat, ampm]);

  const hours: SimpleTimeOption[] = useMemo(
    () =>
      Array.from({ length: use12HourFormat ? 12 : 24 }, (_, i) => {
        let disabled = false;
        const hourValue = use12HourFormat ? (i === 0 ? 12 : i) : i;
        const hDate = setHours(value, use12HourFormat ? i + ampm * 12 : i);
        const hStart = startOfHour(hDate);
        const hEnd = endOfHour(hDate);
        if (min && hEnd < min) disabled = true;
        if (max && hStart > max) disabled = true;
        return {
          value: hourValue,
          label: hourValue.toString().padStart(2, "0"),
          disabled,
        };
      }),
    [value, min, max, use12HourFormat, ampm],
  );
  const minutes: SimpleTimeOption[] = useMemo(() => {
    const anchorDate = setMilliseconds(setHours(value, _hourIn24h), 0);
    return Array.from({ length: 60 }, (_, i) => {
      let disabled = false;
      const mDate = setMinutes(anchorDate, i);
      const mStart = startOfMinute(mDate);
      const mEnd = endOfMinute(mDate);
      if (min && mEnd < min) disabled = true;
      if (max && mStart > max) disabled = true;
      return {
        value: i,
        label: i.toString().padStart(2, "0"),
        disabled,
      };
    });
  }, [value, min, max, _hourIn24h]);
  const ampmOptions = useMemo(() => {
    const startD = startOfDay(value);
    const endD = endOfDay(value);
    return [
      { value: AM_VALUE, label: "AM" },
      { value: PM_VALUE, label: "PM" },
    ].map((v) => {
      let disabled = false;
      const start = addHours(startD, v.value * 12);
      const end = subHours(endD, (1 - v.value) * 12);
      if (min && end < min) disabled = true;
      if (max && start > max) disabled = true;
      return { ...v, disabled };
    });
  }, [value, min, max]);

  const [open, setOpen] = useState(false);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        hourRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        minuteRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }, 1);
    return () => clearTimeout(timeoutId);
  }, [open]);
  const onHourChange = useCallback(
    (v: SimpleTimeOption) => {
      let newMinute = minute;
      if (min) {
        const newTime = buildTime({
          use12HourFormat,
          value,
          formatStr,
          hour: v.value,
          minute,
          ampm,
        });
        if (newTime < min) newMinute = min.getMinutes();
      }
      if (max) {
        const newTime = buildTime({
          use12HourFormat,
          value,
          formatStr,
          hour: v.value,
          minute: newMinute,
          ampm,
        });
        if (newTime > max) newMinute = max.getMinutes();
      }
      setHour(v.value);
      setMinute(newMinute);
      onChange(
        buildTime({
          use12HourFormat,
          value,
          formatStr,
          hour: v.value,
          minute: newMinute,
          ampm,
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setHour, use12HourFormat, value, formatStr, minute, ampm, onChange],
  );

  const onMinuteChange = useCallback(
    (v: SimpleTimeOption) => {
      setMinute(v.value);
      onChange(
        buildTime({
          use12HourFormat,
          value,
          formatStr,
          hour,
          minute: v.value,
          ampm,
        }),
      );
    },
    [use12HourFormat, value, formatStr, hour, ampm, onChange],
  );

  const onAmpmChange = useCallback(
    (v: SimpleTimeOption) => {
      let newHour = hour;
      let newMinute = minute;
      if (min) {
        const newTime = buildTime({
          use12HourFormat,
          value,
          formatStr,
          hour,
          minute,
          ampm: v.value,
        });
        if (newTime < min) {
          const minH = min.getHours() % 12;
          newHour = minH === 0 ? 12 : minH;
          newMinute = min.getMinutes();
        }
      }
      if (max) {
        const newTime = buildTime({
          use12HourFormat,
          value,
          formatStr,
          hour: newHour,
          minute: newMinute,
          ampm: v.value,
        });
        if (newTime > max) {
          const maxH = max.getHours() % 12;
          newHour = maxH === 0 ? 12 : maxH;
          newMinute = max.getMinutes();
        }
      }
      setHour(newHour);
      setMinute(newMinute);
      setAmpm(v.value);
      onChange(
        buildTime({
          use12HourFormat,
          value,
          formatStr,
          hour: newHour,
          minute: newMinute,
          ampm: v.value,
        }),
      );
    },
    [setAmpm, use12HourFormat, value, formatStr, hour, minute, min, max, onChange],
  );

  const display = useMemo(() => {
    return format(value, use12HourFormat ? "hh:mm a" : "HH:mm");
  }, [value, use12HourFormat]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <div
            // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-9 px-3 items-center justify-between cursor-pointer font-normal border border-orange-100 rounded-md text-sm text-stone-500 bg-white hover:border-[var(--color-orange-500)]/50 transition-colors",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            tabIndex={0}
          >
            <Clock className="mr-2 size-4" />
            {display}
            <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </div>
        }
      />
      <PopoverContent
        className="p-0 bg-white border border-orange-100 shadow-md"
        side="bottom"
        align="start"
      >
        <div className="flex-col gap-2 p-2">
          <div className="flex h-56 grow">
            <ScrollArea className="h-full flex-grow">
              <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                {hours.map((v) => (
                  <div
                    ref={v.value === hour ? hourRef : undefined}
                    key={v.value}
                  >
                    <TimeItem
                      option={v}
                      selected={v.value === hour}
                      onSelect={onHourChange}
                      disabled={v.disabled}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            <ScrollArea className="h-full flex-grow">
              <div className="flex grow flex-col items-stretch overflow-y-auto pe-2 pb-48">
                {minutes.map((v) => (
                  <div
                    ref={v.value === minute ? minuteRef : undefined}
                    key={v.value}
                  >
                    <TimeItem
                      option={v}
                      selected={v.value === minute}
                      onSelect={onMinuteChange}
                      disabled={v.disabled}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
            {use12HourFormat && (
              <ScrollArea className="h-full flex-grow">
                <div className="flex grow flex-col items-stretch overflow-y-auto pe-2">
                  {ampmOptions.map((v) => (
                    <TimeItem
                      key={v.value}
                      option={v}
                      selected={v.value === ampm}
                      onSelect={onAmpmChange}
                      className="h-8"
                      disabled={v.disabled}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const TimeItem = ({
  option,
  selected,
  onSelect,
  className,
  disabled,
}: {
  option: SimpleTimeOption;
  selected: boolean;
  onSelect: (option: SimpleTimeOption) => void;
  className?: string;
  disabled?: boolean;
}) => {
  return (
    <Button
      variant="ghost"
      className={cn("flex justify-center px-1 pe-2 ps-1", className)}
      onClick={() => onSelect(option)}
      disabled={disabled}
    >
      <div className="w-4">
        {selected && <CheckIcon className="my-auto size-4" />}
      </div>
      <span className="ms-2">{option.label}</span>
    </Button>
  );
};

interface BuildTimeOptions {
  use12HourFormat?: boolean;
  value: Date;
  formatStr: string;
  hour: number;
  minute: number;
  ampm: number;
}

function buildTime(options: BuildTimeOptions) {
  const { use12HourFormat, value, formatStr, hour, minute, ampm } = options;
  let date: Date;
  if (use12HourFormat) {
    const dateStrRaw = format(value, formatStr);
    let dateStr =
      dateStrRaw.slice(0, 11) +
      hour.toString().padStart(2, "0") +
      dateStrRaw.slice(13);
    dateStr =
      dateStr.slice(0, 14) +
      minute.toString().padStart(2, "0") +
      dateStr.slice(16);
    dateStr =
      dateStr.slice(0, 21) +
      (ampm == AM_VALUE ? "AM" : "PM") +
      dateStr.slice(23);
    date = parse(dateStr, formatStr, value);
  } else {
    date = setHours(setMinutes(setMilliseconds(value, 0), minute), hour);
  }
  return date;
}
