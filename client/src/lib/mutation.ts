import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useClub } from "./club";

/**
 * Mutação padrão do app: mostra a mensagem de sucesso ou o erro do servidor
 * e recarrega os dados do clube ativo.
 */
export function useClubMutation<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  options: { success?: string; onSuccess?: (result: TResult, vars: TVars) => void; refreshClubs?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const { key } = useClub();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: key() });
      if (options.refreshClubs) queryClient.invalidateQueries({ queryKey: ["clubs"] });
      if (options.success) toast.success(options.success);
      options.onSuccess?.(result, vars);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
