"use client";
import React, { useState } from "react";
import { Flex, Text, Grid, Box, Card, Container, Link, Heading, Separator, Table, Popover, Button } from "@radix-ui/themes";
import { CalendarIcon, ChevronRightIcon, ExternalLinkIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Calendar } from "../date-picker/calender";
import { DateRange } from "react-day-picker";
import { useRouter, usePathname } from "next/navigation";

export const SearchDate = ({
  dateRange,
}: {
  dateRange: {
    from: Date;
    to: Date;
  };
}) => {
  const [calenderDate, setCalenderDate] = React.useState<DateRange | undefined>(dateRange);
  const router = useRouter();
  const path = usePathname();

  const onSearch = () => {
    const params = new URLSearchParams();
    const start = calenderDate?.from;
    const end = calenderDate?.to;
    if (!start || !end) {
      return;
    }

    params.set("start", start.toISOString());
    params.set("end", end.toISOString());
    router.replace(path + "?" + params.toString());
  };

  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button id="date" variant={"outline"} size="2">
          <CalendarIcon />
          {`${dateRange.from.toISOString()} - ${dateRange.to.toISOString()}`}
        </Button>
      </Popover.Trigger>
      <Popover.Content height="430px" maxWidth="600px">
        <Flex direction="column">
          <Calendar initialFocus mode="range" defaultMonth={calenderDate?.from} selected={calenderDate} onSelect={setCalenderDate} numberOfMonths={2} />
          <Flex justify="end" px="4">
            <Popover.Close disabled={!calenderDate?.from || !calenderDate?.to}>
              <Button type="submit" onClick={onSearch}>
                Search
              </Button>
            </Popover.Close>
          </Flex>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
};
