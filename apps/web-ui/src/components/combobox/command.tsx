"use client";

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";

// reference Code : https://ui.shadcn.com/docs/components/command
// reference CSS  : https://tailwindcss.com/docs/installation
const Command = React.forwardRef<React.ElementRef<typeof CommandPrimitive>, React.ComponentPropsWithoutRef<typeof CommandPrimitive>>(
  ({ className, ...props }, ref) => <CommandPrimitive ref={ref} className={""} {...props} />
);
Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
      <MagnifyingGlassIcon />
      <CommandPrimitive.Input
        ref={ref}
        className={
          "flex h-7 w-full bg-transparent py-1 px-1 font-sans text-2 outline-none placeholder:text-gray-5 disabled:cursor-not-allowed disabled:opacity-50"
        }
        {...props}
      />
    </div>
  )
);
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<React.ElementRef<typeof CommandPrimitive.List>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>>(
  ({ className, ...props }, ref) => <CommandPrimitive.List ref={ref} className={"max-h-[245px] py-1 overflow-y-auto overflow-x-hidden"} {...props} />
);
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandGroup = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Group>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>>(
  ({ className, ...props }, ref) => <CommandPrimitive.Group ref={ref} className={"[&_[cmdk-group-heading]]:px-0 [&_[cmdk-group-heading]]:py-0"} {...props} />
);
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => <CommandPrimitive.Separator ref={ref} className={"-mx-1 h-px p-1 bg-border"} {...props} />);
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Item>, React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={"relative flex rounded-3 cursor-default font-sans text-2 px-2 py-1 aria-selected:bg-accent-9 aria-selected:text-gray-1"}
      {...props}
    />
  )
);
CommandItem.displayName = CommandPrimitive.Item.displayName;

export { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator };
