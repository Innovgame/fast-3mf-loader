import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot, Tooltip as TooltipPrimitive, Tabs as TabsPrimitive, Accordion as AccordionPrimitive, Progress as ProgressPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const buttonVariants = cva("ui-button", {
    variants: {
        variant: { default: "ui-button-primary", outline: "ui-button-outline", ghost: "ui-button-ghost", secondary: "ui-button-secondary" },
        size: { default: "ui-button-default", sm: "ui-button-sm", icon: "ui-button-icon" },
    },
    defaultVariants: { variant: "default", size: "default" },
});

export function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot.Root : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Badge({ className, tone = "neutral", ...props }: ComponentProps<"span"> & { tone?: "neutral" | "blue" | "success" | "warning" }) {
    return <span className={cn("ui-badge", `ui-badge-${tone}`, className)} {...props} />;
}

export function Hint({ label, children }: { label: string; children: ReactNode }) {
    return (
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content className="ui-tooltip" sideOffset={8}>
                    {label}
                    <TooltipPrimitive.Arrow className="ui-tooltip-arrow" />
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList(props: ComponentProps<typeof TabsPrimitive.List>) {
    return <TabsPrimitive.List {...props} className={cn("ui-tabs-list", props.className)} />;
}

export function TabsTrigger(props: ComponentProps<typeof TabsPrimitive.Trigger>) {
    return <TabsPrimitive.Trigger {...props} className={cn("ui-tabs-trigger", props.className)} />;
}

export function Progress({ value, label }: { value: number; label: string }) {
    return (
        <ProgressPrimitive.Root className="ui-progress" value={value} aria-label={label}>
            <ProgressPrimitive.Indicator className="ui-progress-indicator" style={{ transform: `translateX(-${100 - value}%)` }} />
        </ProgressPrimitive.Root>
    );
}

export function Accordion({ items }: { items: { title: string; content: string }[] }) {
    return (
        <AccordionPrimitive.Root type="single" collapsible className="ui-accordion">
            {items.map((item, index) => (
                <AccordionPrimitive.Item key={index} value={String(index)} className="ui-accordion-item">
                    <AccordionPrimitive.Header>
                        <AccordionPrimitive.Trigger className="ui-accordion-trigger">
                            {item.title}
                            <ChevronDown aria-hidden="true" size={18} />
                        </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>
                    <AccordionPrimitive.Content className="ui-accordion-content">
                        <p>{item.content}</p>
                    </AccordionPrimitive.Content>
                </AccordionPrimitive.Item>
            ))}
        </AccordionPrimitive.Root>
    );
}
