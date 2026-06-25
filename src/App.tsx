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
import TechnologyList from "./pages/technologies/TechnologyList";
import TechnologyView from "./pages/technologies/TechnologyView";
import TechnologyForm from "./pages/technologies/TechnologyForm";
import RequirementList from "./pages/requirements/RequirementList";
import RequirementView from "./pages/requirements/RequirementView";
import RequirementForm from "./pages/requirements/RequirementForm";
import DecisionList from "./pages/decisions/DecisionList";
import DecisionView from "./pages/decisions/DecisionView";
import DecisionForm from "./pages/decisions/DecisionForm";
import HardeningList from "./pages/hardening/HardeningList";
import HardeningView from "./pages/hardening/HardeningView";
import HardeningForm from "./pages/hardening/HardeningForm";
import ArchTemplateList from "./pages/arch-templates/ArchTemplateList";
import ArchTemplateView from "./pages/arch-templates/ArchTemplateView";
import ArchTemplateForm from "./pages/arch-templates/ArchTemplateForm";
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

          {/* Технологии */}
          <Route path="/technologies" element={<Layout section="technologies"><TechnologyList /></Layout>} />
          <Route path="/technologies/new" element={<Layout section="technologies"><TechnologyForm /></Layout>} />
          <Route path="/technologies/:id" element={<Layout section="technologies"><TechnologyView /></Layout>} />
          <Route path="/technologies/:id/edit" element={<Layout section="technologies"><TechnologyForm /></Layout>} />

          {/* Требования */}
          <Route path="/requirements" element={<Layout section="requirements"><RequirementList /></Layout>} />
          <Route path="/requirements/new" element={<Layout section="requirements"><RequirementForm /></Layout>} />
          <Route path="/requirements/:id" element={<Layout section="requirements"><RequirementView /></Layout>} />
          <Route path="/requirements/:id/edit" element={<Layout section="requirements"><RequirementForm /></Layout>} />

          {/* Решения */}
          <Route path="/solutions" element={<Layout section="solutions"><DecisionList /></Layout>} />
          <Route path="/solutions/new" element={<Layout section="solutions"><DecisionForm /></Layout>} />
          <Route path="/solutions/:id" element={<Layout section="solutions"><DecisionView /></Layout>} />
          <Route path="/solutions/:id/edit" element={<Layout section="solutions"><DecisionForm /></Layout>} />

          {/* Харденинг и конфигурации */}
          <Route path="/hardening" element={<Layout section="hardening"><HardeningList /></Layout>} />
          <Route path="/hardening/new" element={<Layout section="hardening"><HardeningForm /></Layout>} />
          <Route path="/hardening/:id" element={<Layout section="hardening"><HardeningView /></Layout>} />
          <Route path="/hardening/:id/edit" element={<Layout section="hardening"><HardeningForm /></Layout>} />

          {/* Шаблоны архитектур */}
          <Route path="/templates" element={<Layout section="templates"><ArchTemplateList /></Layout>} />
          <Route path="/templates/new" element={<Layout section="templates"><ArchTemplateForm /></Layout>} />
          <Route path="/templates/:id" element={<Layout section="templates"><ArchTemplateView /></Layout>} />
          <Route path="/templates/:id/edit" element={<Layout section="templates"><ArchTemplateForm /></Layout>} />

          {/* Остальные разделы */}
          <Route path="/:section" element={<Layout />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;