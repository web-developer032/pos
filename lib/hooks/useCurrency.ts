import { useGetSettingsQuery } from "@/lib/api/settingsApi";

export function useCurrency() {
  const { data } = useGetSettingsQuery();
  const currencySymbol = data?.settings?.currency_symbol || "$";
  
  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  return {
    symbol: currencySymbol,
    format: formatCurrency,
  };
}

