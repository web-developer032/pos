import { useGetSettingsQuery } from "@/lib/api/settingsApi";

export function useCurrency() {
  const { data } = useGetSettingsQuery();
  const currencySymbol = data?.settings?.currency_symbol || "$";
  
  const formatCurrency = (amount: number): string => {
    // Use Intl.NumberFormat for proper number notation with thousand separators
    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return `${currencySymbol}${formatter.format(amount)}`;
  };

  return {
    symbol: currencySymbol,
    format: formatCurrency,
  };
}

