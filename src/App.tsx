import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import OrgDomainList from "./pages/org-domains/OrgDomainList";
import OrgDomainView from "./pages/org-domains/OrgDomainView";
import OrgDomainForm from "./pages/org-domains/OrgDomainForm";
import TechDomainList from "./pages/tech-domains/TechDomainList";
import TechDomainView from "./pages/tech-domains/TechDomainView";
import TechDomainForm from "./pages/tech-domains/TechDomainForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />

          {/* Организационный домен */}
          <Route path="/org-domain" element={<Layout section="org-domain"><OrgDomainList /></Layout>} />
          <Route path="/org-domain/new" element={<Layout section="org-domain"><OrgDomainForm /></Layout>} />
          <Route path="/org-domain/:id" element={<Layout section="org-domain"><OrgDomainView /></Layout>} />
          <Route path="/org-domain/:id/edit" element={<Layout section="org-domain"><OrgDomainForm /></Layout>} />

          {/* Технический домен */}
          <Route path="/tech-domain" element={<Layout section="tech-domain"><TechDomainList /></Layout>} />
          <Route path="/tech-domain/new" element={<Layout section="tech-domain"><TechDomainForm /></Layout>} />
          <Route path="/tech-domain/:id" element={<Layout section="tech-domain"><TechDomainView /></Layout>} />
          <Route path="/tech-domain/:id/edit" element={<Layout section="tech-domain"><TechDomainForm /></Layout>} />

          {/* Остальные разделы */}
          <Route path="/:section" element={<Layout />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;