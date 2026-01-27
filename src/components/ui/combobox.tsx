// components/ui/combobox.tsx

<Command>
  {/* ✅ تأكد من ظهور CommandInput */}
  <div className="border-b border-gray-200 px-1">
    <CommandInput 
      placeholder="ابحث..." 
      className="text-sm h-10 text-gray-900 placeholder-gray-500" 
    />
  </div>
  <CommandEmpty className="py-2 text-sm text-gray-500 px-2">
    لا توجد نتائج.
  </CommandEmpty>
  <CommandGroup className="max-h-64 overflow-auto">
    {options.map((option) => (
      <CommandItem
        key={option.value}
        onSelect={() => {
          onChange(option.value)
          setOpen(false)
        }}
        className="cursor-pointer px-2 py-1 hover:bg-yellow-100"
      >
        <Check
          className={cn(
            "w-4 h-4 ml-2",
            value === option.value ? "opacity-100" : "opacity-0"
          )}
        />
        <span className="text-gray-900">{option.label}</span>
      </CommandItem>
    ))}
  </CommandGroup>
</Command>