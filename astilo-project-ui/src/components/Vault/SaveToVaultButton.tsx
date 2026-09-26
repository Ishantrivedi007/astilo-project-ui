import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import { Button } from "@heroui/react";

import { saveToVault, type SaveToVaultInput } from "../../lib/vaultApi";

interface SaveToVaultButtonProps extends SaveToVaultInput {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Drop this on any page that shows something worth remembering — the
 * signature "everything can be saved" entry point the Vault module reads
 * back from. Callers pass the item's own title/url/thumbnail/metadata; this
 * button just wires that into a single POST /vault call. */
const SaveToVaultButton = ({ label = "Save to Vault", size = "md", className, ...input }: SaveToVaultButtonProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => saveToVault(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-items"] });
      toast.success(`Saved "${input.title}" to your Vault`);
    },
    onError: () => toast.error("Couldn't save that to your Vault."),
  });

  return (
    <Button
      radius="full"
      variant="bordered"
      size={size}
      isLoading={mutation.isPending}
      isDisabled={mutation.isSuccess}
      className={`border-hair/40 font-semibold text-ink ${className ?? ""}`}
      onPress={() => mutation.mutate()}
    >
      <Bookmark size={14} className="mr-1 inline" />
      {mutation.isSuccess ? "Saved" : label}
    </Button>
  );
};

export default SaveToVaultButton;
