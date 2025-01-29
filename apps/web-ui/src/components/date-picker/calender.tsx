"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { DayPicker } from "react-day-picker";
import { Button } from "@radix-ui/themes";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// reference Code : https://ui.shadcn.com/docs/components/calendar
// modified tailwind class name as below
// bg-accent is bg-accent-3
// bg-primary is bg-accent-9
// bg-accent/50 is bg-accent-2
// text-muted-foreground  is text-gray-5
// text-accent-foreground is text-gray-12
// text-primary-foreground is text-gray-12
// rounded-md is rounded-4
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={"p-3"}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-5  w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative hover:bg-accent-3 focus-within:relative focus-within:z-20 hover:rounded-4",
        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        day_range_end: "day-range-end",
        day_selected: "bg-accent-9 text-gray-5 hover:bg-accent-9 hover:text-gray-5 focus:bg-accent-9 focus:text-gray-5 rounded-4",
        day_today: "bg-accent-3 text-gray-12 rounded-4",
        day_outside: "day-outside text-gray-5 opacity-50 aria-selected:bg-accent-2 aria-selected:text-gray-5 aria-selected:opacity-30",
        day_disabled: "text-gray-5 opacity-50",
        day_range_middle: "aria-selected:bg-accent-3 aria-selected:text-gray-12 aria-selected:rounded-[0px]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRightIcon className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
