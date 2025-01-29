import { Calendar } from "@/components/date-picker/calender";
import { DateRange } from "react-day-picker";
import { Flex, Popover, Button } from "@radix-ui/themes";
import { CalendarIcon } from "@radix-ui/react-icons";

export const SelectCalendarDate = ({
  dateRange,
  calenderDate,
  setCalenderDate,
  onSearch,
}: {
  dateRange: {
    from: Date;
    to: Date;
  };
  calenderDate: DateRange | undefined;
  setCalenderDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  onSearch: () => void;
}) => {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button id="date" variant="outline" size="2">
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
