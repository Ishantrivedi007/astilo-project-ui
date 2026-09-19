import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchDownloadJobs,
  startDownload,
  type DownloadJob,
  type DownloadOptions,
} from "../../lib/musicApi";
import { SONGS_QUERY_KEY } from "./useMusicLibrary";

const DOWNLOAD_JOBS_QUERY_KEY = ["music", "downloads"];

interface DownloadsContextValue {
  jobs: DownloadJob[];
  activeJobs: DownloadJob[];
  start: (options: DownloadOptions) => Promise<DownloadJob["id"]>;
  dismiss: (id: string) => void;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

export const DownloadsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const dismissedRef = useRef<Set<string>>(new Set());
  const seenDoneRef = useRef<Set<string>>(new Set());

  // Fast-polls only while a job is actually in flight; otherwise checks in
  // rarely (a safety net in case a status update was ever missed) instead
  // of hitting the API every second forever regardless of activity.
  const { data: jobs = [] } = useQuery({
    queryKey: DOWNLOAD_JOBS_QUERY_KEY,
    queryFn: fetchDownloadJobs,
    refetchInterval: (query) => {
      const current = query.state.data ?? [];
      const hasActive = current.some((j) => j.status === "starting" || j.status === "downloading" || j.status === "processing");
      return hasActive ? 1000 : 60_000;
    },
  });

  // React to jobs finishing so the library refreshes and a toast fires
  // exactly once per job, regardless of which page kicked it off.
  useEffect(() => {
    for (const job of jobs) {
      if (job.status === "done" && !seenDoneRef.current.has(job.id)) {
        seenDoneRef.current.add(job.id);
        queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
        toast.success(`Downloaded "${job.title}" 🎉`);
      } else if (job.status === "error" && !seenDoneRef.current.has(job.id)) {
        seenDoneRef.current.add(job.id);
        toast.error(`Couldn't download "${job.title ?? "that track"}" — ${job.error ?? "try again"}`);
      }
    }
  }, [jobs, queryClient]);

  const startMutation = useMutation({
    mutationFn: (options: DownloadOptions) => startDownload(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOWNLOAD_JOBS_QUERY_KEY });
    },
    onError: () => toast.error("Couldn't start that download."),
  });

  const start = async (options: DownloadOptions) => {
    const { jobId } = await startMutation.mutateAsync(options);
    return jobId;
  };

  const dismiss = (id: string) => {
    dismissedRef.current.add(id);
    queryClient.setQueryData<DownloadJob[]>(DOWNLOAD_JOBS_QUERY_KEY, (prev) =>
      (prev ?? []).filter((j) => j.id !== id)
    );
  };

  const activeJobs = jobs.filter(
    (j) => !dismissedRef.current.has(j.id) && (j.status === "starting" || j.status === "downloading" || j.status === "processing")
  );

  return (
    <DownloadsContext.Provider value={{ jobs, activeJobs, start, dismiss }}>
      {children}
    </DownloadsContext.Provider>
  );
};

export const useDownloads = () => {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error("useDownloads must be used within a DownloadsProvider");
  return ctx;
};
