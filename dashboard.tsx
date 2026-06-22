import { Layout } from "@/components/layout";
import { useGetMyCustomerJobs, useGetJobQuotes, getGetMyCustomerJobsQueryKey, getGetJobQuotesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { getToken, getStoredUser } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400",
  accepted: "bg-primary/10 text-primary",
  in_progress: "bg-orange-500/10 text-orange-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
};

function JobQuotes({ jobId }: { jobId: number }) {
  const { data: quotes, isLoading } = useGetJobQuotes(jobId, { query: { queryKey: getGetJobQuotesQueryKey(jobId) } });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading quotes...</p>;
  if (!quotes || quotes.length === 0) return <p className="text-sm text-muted-foreground">No quotes yet.</p>;
  return (
    <div className="space-y-2 mt-2">
      {quotes.map((q) => (
        <div key={q.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border text-sm">
          <div>
            <p className="font-bold">{q.workerName ?? "Worker"}</p>
            {q.message && <p className="text-muted-foreground">{q.message}</p>}
          </div>
          <span className="font-black text-primary text-lg">P{q.amount}</span>
        </div>
      ))}
    </div>
  );
}

export default function CustomerDashboardPage() {
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const user = getStoredUser() as any;
  const token = getToken();

  const { data: jobs, isLoading } = useGetMyCustomerJobs({ query: { queryKey: getGetMyCustomerJobsQueryKey() } });

  if (!token || (user && user.role !== "customer")) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-2xl font-black mb-4">Customer access only</h2>
            <p className="text-muted-foreground mb-6">Please log in to access your dashboard.</p>
            <Link href="/customers/login"><Button className="bg-primary text-primary-foreground font-bold">Log In</Button></Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-primary font-bold tracking-wider text-sm uppercase">Customer Dashboard</span>
              <h1 className="text-3xl font-black uppercase mt-1">My Jobs</h1>
            </div>
            <Link href="/customers/post-job">
              <Button className="bg-primary text-primary-foreground font-bold" data-testid="button-post-job">
                <Plus className="h-4 w-4 mr-2" /> Post New Job
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-lg bg-card animate-pulse" />)}</div>
          ) : !jobs || jobs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-lg">
              <p className="text-lg font-medium mb-2 text-muted-foreground">No jobs posted yet</p>
              <p className="text-sm text-muted-foreground mb-6">Post your first job to get started</p>
              <Link href="/customers/post-job">
                <Button className="bg-primary text-primary-foreground font-bold">Post a Job</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const isExpanded = expandedJob === job.id;
                return (
                  <div key={job.id} data-testid={`card-job-${job.id}`} className="rounded-lg bg-card border border-border overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-black text-primary">{job.serviceType}</span>
                            {job.serviceTier && <span className="text-sm text-muted-foreground">— {job.serviceTier}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status] ?? ""}`}>
                              {job.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{job.description}</p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{job.preferredDate}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.preferredTime}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.transportZone === "inside_gaborone" ? "Inside Gaborone" : "Outside Gaborone"}</span>
                          </div>
                          {job.workerName && (
                            <p className="mt-2 text-sm">
                              <span className="text-muted-foreground">Worker: </span>
                              <span className="font-bold text-foreground">{job.workerName}</span>
                            </p>
                          )}
                          {job.totalPrice && (
                            <p className="mt-1 text-sm">
                              <span className="text-muted-foreground">Total: </span>
                              <span className="font-bold text-primary">P{job.totalPrice}</span>
                            </p>
                          )}
                        </div>
                        <button
                          data-testid={`button-expand-job-${job.id}`}
                          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                          className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                        >
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-border pt-4">
                        <h4 className="text-sm font-bold mb-2 text-foreground">Worker Quotes</h4>
                        <JobQuotes jobId={job.id} />

                        {job.photos && job.photos.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-bold mb-2 text-foreground">Job Photos</h4>
                            <div className="flex gap-3">
                              {job.photos.map((p) => (
                                <div key={p.id} className="relative">
                                  <img src={p.photoUrl} alt={p.photoType} className="h-20 w-20 object-cover rounded-md border border-border" />
                                  <span className="absolute bottom-0 left-0 right-0 text-xs text-center bg-black/60 text-white rounded-b-md py-0.5">
                                    {p.photoType}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
