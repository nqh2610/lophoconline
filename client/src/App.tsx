import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Tutors from "@/pages/Tutors";
import TutorRegistration from "@/pages/TutorRegistration";
import TutorDashboard from "@/pages/TutorDashboard";
import TutorVerification from "@/pages/TutorVerification";
import TutorProfileSetup from "@/pages/TutorProfileSetup";
import TutorScheduleSetup from "@/pages/TutorScheduleSetup";
import TutorTrialRequests from "@/pages/TutorTrialRequests";
import TutorTeaching from "@/pages/TutorTeaching";
import TutorFeedback from "@/pages/TutorFeedback";
import TutorReputation from "@/pages/TutorReputation";
import About from "@/pages/About";
import HowItWorks from "@/pages/HowItWorks";
import Pricing from "@/pages/Pricing";
import FAQ from "@/pages/FAQ";
import ForTutors from "@/pages/ForTutors";
import ForStudents from "@/pages/ForStudents";
import ForParents from "@/pages/ForParents";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import TutorDetail from "@/pages/TutorDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tutors" component={Tutors} />
      <Route path="/tutor-registration" component={TutorRegistration} />
      
      {/* Tutor Flow Routes - Must come BEFORE /tutor/:id to avoid wildcard matching */}
      <Route path="/tutor/dashboard" component={TutorDashboard} />
      <Route path="/tutor/verification" component={TutorVerification} />
      <Route path="/tutor/profile-setup" component={TutorProfileSetup} />
      <Route path="/tutor/schedule-setup" component={TutorScheduleSetup} />
      <Route path="/tutor/trial-requests" component={TutorTrialRequests} />
      <Route path="/tutor/teaching" component={TutorTeaching} />
      <Route path="/tutor/feedback" component={TutorFeedback} />
      <Route path="/tutor/reputation" component={TutorReputation} />
      
      {/* Dynamic tutor detail route - Must come AFTER specific /tutor/* routes */}
      <Route path="/tutor/:id" component={TutorDetail} />
      
      <Route path="/about" component={About} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/faq" component={FAQ} />
      <Route path="/for-tutors" component={ForTutors} />
      <Route path="/for-students" component={ForStudents} />
      <Route path="/for-parents" component={ForParents} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
