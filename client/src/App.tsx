import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import ChatPage from "@/pages/ChatPage";
import Settings from "@/pages/Settings";
import VoicePage from "@/pages/VoicePage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/c/:id" component={ChatPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/voice" component={VoicePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
