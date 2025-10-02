import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";

export function CurrencySelector() {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Currency Preference</h3>
          <p className="text-sm text-muted-foreground">
            Choose your preferred currency for all monetary displays
          </p>
        </div>
        <Badge variant="secondary" className="ml-2">
          {selectedCurrency.symbol}
        </Badge>
      </div>
      
      <Select
        value={selectedCurrency.code}
        onValueChange={(code) => {
          const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
          if (currency) {
            setSelectedCurrency(currency);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              <div className="flex items-center gap-2">
                <span className="font-mono">{currency.symbol}</span>
                <span>{currency.name}</span>
                <span className="text-xs text-muted-foreground">({currency.code})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}