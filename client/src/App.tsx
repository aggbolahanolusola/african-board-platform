import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Meetings from "./pages/Meetings";
import MeetingRecordings from "./pages/MeetingRecordings";
import Documents from "./pages/Documents";
import Compliance from "./pages/Compliance";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import { SignUp } from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import VerificationPending from "./pages/VerificationPending";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import { SessionTimeoutProvider } from "./contexts/SessionTimeoutContext";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/login"} component={Login} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/verify-email"} component={VerifyEmail} />
      <Route path={"/verification-pending"} component={() => {
        const email = sessionStorage.getItem('verificationEmail') || '';
        const name = sessionStorage.getItem('verificationName') || '';
        return <VerificationPending email={email} userName={name} />;
      }} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/dashboard"} component={OrganizationDashboard} />
      <Route path={"/org-dashboard"} component={OrganizationDashboard} />
      <Route path={"/meetings"} component={Meetings} />
      <Route path={"/recordings"} component={MeetingRecordings} />
      <Route path={"/documents"} component={Documents} />
      <Route path={"/compliance"} component={Compliance} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <SessionTimeoutProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SessionTimeoutProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
