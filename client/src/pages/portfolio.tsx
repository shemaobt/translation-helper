import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Sidebar from "@/components/sidebar";
import { 
  Award, 
  Calendar, 
  Plus, 
  Trash2,
  CheckCircle2,
  Circle,
  Target,
  GraduationCap,
  Activity,
  FileText,
  Download,
  User,
  Edit,
  Save,
  Sparkles,
  Zap,
  Menu
} from "lucide-react";
import { 
  CORE_COMPETENCIES,
  getCompetencyName,
  type CompetencyId,
  type FacilitatorCompetency, 
  type FacilitatorQualification, 
  type MentorshipActivity,
  type QuarterlyReport
} from "@shared/schema";

const competencyStatusOptions = ['not_started', 'emerging', 'growing', 'proficient', 'advanced'] as const;
type CompetencyStatus = typeof competencyStatusOptions[number];

const statusLabels: Record<CompetencyStatus, string> = {
  not_started: 'Não Iniciado',
  emerging: 'Emergente',
  growing: 'Em Crescimento',
  proficient: 'Proficiente',
  advanced: 'Avançado'
};

const statusColors: Record<CompetencyStatus, string> = {
  not_started: 'text-muted-foreground',
  emerging: 'text-yellow-600',
  growing: 'text-blue-600',
  proficient: 'text-green-600',
  advanced: 'text-purple-600'
};

export default function Portfolio() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ensure sidebar is closed when switching to mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Competency notes editing state
  const [editingCompetency, setEditingCompetency] = useState<CompetencyId | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  // Qualifications state
  const [newQualCourseTitle, setNewQualCourseTitle] = useState("");
  const [newQualInstitution, setNewQualInstitution] = useState("");
  const [newQualCompletionDate, setNewQualCompletionDate] = useState("");
  const [newQualCredential, setNewQualCredential] = useState("");
  const [newQualDescription, setNewQualDescription] = useState("");
  const [qualificationDialogOpen, setQualificationDialogOpen] = useState(false);

  // Activities state
  const [newActivityLanguage, setNewActivityLanguage] = useState("");
  const [newActivityChapters, setNewActivityChapters] = useState("1");
  const [newActivityNotes, setNewActivityNotes] = useState("");
  const [newActivityDate, setNewActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  // Reports state
  const [reportPeriodStart, setReportPeriodStart] = useState("");
  const [reportPeriodEnd, setReportPeriodEnd] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<QuarterlyReport | null>(null);

  // Fetch competencies
  const { data: competencies = [], isLoading: loadingCompetencies } = useQuery<FacilitatorCompetency[]>({
    queryKey: ['/api/facilitator/competencies'],
    enabled: isAuthenticated
  });

  // Fetch qualifications
  const { data: qualifications = [], isLoading: loadingQualifications } = useQuery<FacilitatorQualification[]>({
    queryKey: ['/api/facilitator/qualifications'],
    enabled: isAuthenticated
  });

  // Fetch activities
  const { data: activities = [], isLoading: loadingActivities } = useQuery<MentorshipActivity[]>({
    queryKey: ['/api/facilitator/activities'],
    enabled: isAuthenticated
  });

  // Fetch facilitator profile
  const { data: facilitatorProfile, isLoading: loadingProfile } = useQuery<{ region: string | null; mentorSupervisor: string | null }>({
    queryKey: ['/api/facilitator/profile'],
    enabled: isAuthenticated
  });

  // Profile editing state
  const [profileRegion, setProfileRegion] = useState("");
  const [profileSupervisor, setProfileSupervisor] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Update competency status mutation
  const updateCompetencyMutation = useMutation({
    mutationFn: async ({ competencyId, status, notes }: { competencyId: CompetencyId; status: CompetencyStatus; notes?: string }) => {
      await apiRequest("POST", "/api/facilitator/competencies", { competencyId, status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/competencies'] });
      toast({
        title: "Sucesso",
        description: "Status da competência atualizado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar competência",
        variant: "destructive",
      });
    },
  });

  // Create qualification mutation
  const createQualificationMutation = useMutation({
    mutationFn: async (data: { courseTitle: string; institution: string; completionDate: string; credential?: string; description?: string }) => {
      await apiRequest("POST", "/api/facilitator/qualifications", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/qualifications'] });
      setQualificationDialogOpen(false);
      setNewQualCourseTitle("");
      setNewQualInstitution("");
      setNewQualCompletionDate("");
      setNewQualCredential("");
      setNewQualDescription("");
      toast({
        title: "Sucesso",
        description: "Qualificação adicionada",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao adicionar qualificação",
        variant: "destructive",
      });
    },
  });

  // Delete qualification mutation
  const deleteQualificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/facilitator/qualifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/qualifications'] });
      toast({
        title: "Sucesso",
        description: "Qualificação removida",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover qualificação",
        variant: "destructive",
      });
    },
  });

  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (data: { languageName: string; chaptersCount: number; activityDate: string; notes?: string }) => {
      await apiRequest("POST", "/api/facilitator/activities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/activities'] });
      setActivityDialogOpen(false);
      setNewActivityLanguage("");
      setNewActivityChapters("1");
      setNewActivityNotes("");
      setNewActivityDate(new Date().toISOString().split('T')[0]);
      toast({
        title: "Sucesso",
        description: "Atividade registrada",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao registrar atividade",
        variant: "destructive",
      });
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/facilitator/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/activities'] });
      toast({
        title: "Sucesso",
        description: "Atividade removida",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover atividade",
        variant: "destructive",
      });
    },
  });

  // Update facilitator profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { region: string; mentorSupervisor: string }) => {
      await apiRequest("POST", "/api/facilitator/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/profile'] });
      setIsEditingProfile(false);
      toast({
        title: "Sucesso",
        description: "Perfil atualizado",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive",
      });
    },
  });

  // Fetch reports
  const { data: reports = [], isLoading: loadingReports } = useQuery<QuarterlyReport[]>({
    queryKey: ['/api/facilitator/reports'],
    enabled: isAuthenticated
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: { periodStart: string; periodEnd: string }) => {
      await apiRequest("POST", "/api/facilitator/reports/generate", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/reports'] });
      setReportDialogOpen(false);
      setReportPeriodStart("");
      setReportPeriodEnd("");
      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao gerar relatório",
        variant: "destructive",
      });
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await apiRequest("DELETE", `/api/facilitator/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/reports'] });
      setSelectedReport(null);
      toast({
        title: "Sucesso",
        description: "Relatório removido",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover relatório",
        variant: "destructive",
      });
    },
  });


  // Populate profile form when profile data loads
  useEffect(() => {
    if (facilitatorProfile) {
      setProfileRegion(facilitatorProfile.region || "");
      setProfileSupervisor(facilitatorProfile.mentorSupervisor || "");
    }
  }, [facilitatorProfile]);

  // Calculate competency progress
  const competencyProgress = Object.keys(CORE_COMPETENCIES).length > 0
    ? (competencies.filter(c => c.status === 'proficient' || c.status === 'advanced').length / Object.keys(CORE_COMPETENCIES).length) * 100
    : 0;

  // Get status for a competency
  const getCompetencyStatus = (competencyId: CompetencyId): CompetencyStatus => {
    const competency = competencies.find(c => c.competencyId === competencyId);
    return (competency?.status as CompetencyStatus) || 'not_started';
  };

  // Get notes for a competency
  const getCompetencyNotes = (competencyId: CompetencyId): string => {
    const competency = competencies.find(c => c.competencyId === competencyId);
    return competency?.notes || '';
  };

  // Get competency data object
  const getCompetencyData = (competencyId: CompetencyId) => {
    return competencies.find(c => c.competencyId === competencyId);
  };

  // Check if competency has a suggestion different from current status
  const hasSuggestion = (competencyId: CompetencyId): boolean => {
    const competency = getCompetencyData(competencyId);
    if (!competency) return false;
    return competency.statusSource === 'manual' && 
           competency.suggestedStatus !== null && 
           competency.suggestedStatus !== competency.status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex relative overflow-hidden" data-testid="page-portfolio">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 2xl:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } w-4/5 max-w-sm`
          : 'h-screen w-80'
        }
      `}>
        <Sidebar 
          isMobile={isMobile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      
      <div className={`flex-1 h-screen overflow-y-auto ${isMobile ? 'p-4' : 'p-8'}`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
          {/* Header */}
          <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
            <div className="flex items-start gap-3">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  className="mt-1 flex-shrink-0"
                  data-testid="button-open-sidebar"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1">
                <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
                  Portfólio de Facilitador
                </h1>
                <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : ''}`}>
                  Acompanhe suas competências, qualificações e atividades de tradução
                </p>
              </div>
            </div>
          </div>

          {/* Competency Overview */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso Geral das Competências</span>
                <span className="text-sm text-muted-foreground">{Math.round(competencyProgress)}%</span>
              </div>
              <Progress value={competencyProgress} className="h-2" />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" data-testid="tab-profile">
                <User className="h-4 w-4 mr-2" />
                {!isMobile && "Perfil"}
              </TabsTrigger>
              <TabsTrigger value="competencies" data-testid="tab-competencies">
                <Target className="h-4 w-4 mr-2" />
                {!isMobile && "Competências"}
              </TabsTrigger>
              <TabsTrigger value="qualifications" data-testid="tab-qualifications">
                <GraduationCap className="h-4 w-4 mr-2" />
                {!isMobile && "Qualificações"}
              </TabsTrigger>
              <TabsTrigger value="activities" data-testid="tab-activities">
                <Activity className="h-4 w-4 mr-2" />
                {!isMobile && "Atividades"}
              </TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">
                <FileText className="h-4 w-4 mr-2" />
                {!isMobile && "Relatórios"}
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Perfil do Facilitador</span>
                  </CardTitle>
                  <CardDescription>
                    Gerencie suas informações de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProfile ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="profile-region">Região (opcional)</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Input
                            id="profile-region"
                            value={profileRegion}
                            onChange={(e) => setProfileRegion(e.target.value)}
                            placeholder="Ex: Nordeste do Brasil"
                            disabled={!isEditingProfile}
                            data-testid="input-profile-region"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="profile-supervisor">Supervisor (opcional)</Label>
                        <div className="flex items-center space-x-2 mt-2">
                          <Input
                            id="profile-supervisor"
                            value={profileSupervisor}
                            onChange={(e) => setProfileSupervisor(e.target.value)}
                            placeholder="Nome do supervisor"
                            disabled={!isEditingProfile}
                            data-testid="input-profile-supervisor"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {isEditingProfile ? (
                          <>
                            <Button
                              onClick={() => {
                                updateProfileMutation.mutate({
                                  region: profileRegion,
                                  mentorSupervisor: profileSupervisor
                                });
                              }}
                              disabled={updateProfileMutation.isPending}
                              data-testid="button-save-profile"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Salvar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditingProfile(false);
                                if (facilitatorProfile) {
                                  setProfileRegion(facilitatorProfile.region || "");
                                  setProfileSupervisor(facilitatorProfile.mentorSupervisor || "");
                                }
                              }}
                              disabled={updateProfileMutation.isPending}
                              data-testid="button-cancel-profile"
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => setIsEditingProfile(true)}
                            data-testid="button-edit-profile"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Perfil
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Competencies Tab */}
            <TabsContent value="competencies" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Competências Principais</span>
                  </CardTitle>
                  <CardDescription>
                    Acompanhe o desenvolvimento de suas competências de facilitação TBO
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCompetencies ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Object.keys(CORE_COMPETENCIES) as CompetencyId[]).map((competencyId) => {
                        const status = getCompetencyStatus(competencyId);
                        const notes = getCompetencyNotes(competencyId);
                        const isEditing = editingCompetency === competencyId;
                        const competencyData = getCompetencyData(competencyId);
                        const showSuggestion = hasSuggestion(competencyId);

                        return (
                          <Card key={competencyId} data-testid={`card-competency-${competencyId}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    {status === 'proficient' || status === 'advanced' ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <h3 className="font-medium" data-testid={`text-competency-name-${competencyId}`}>
                                      {getCompetencyName(competencyId)}
                                    </h3>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <Select
                                      value={status}
                                      onValueChange={(value) => updateCompetencyMutation.mutate({ 
                                        competencyId, 
                                        status: value as CompetencyStatus,
                                        notes
                                      })}
                                    >
                                      <SelectTrigger className="w-48" data-testid={`select-status-${competencyId}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {competencyStatusOptions.map(statusOption => (
                                          <SelectItem key={statusOption} value={statusOption}>
                                            {statusLabels[statusOption]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Badge className={statusColors[status]}>
                                      {statusLabels[status]}
                                    </Badge>
                                  </div>
                                  {showSuggestion && competencyData?.suggestedStatus && (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md" data-testid={`suggestion-${competencyId}`}>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2 mb-1">
                                            <Zap className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                              Sugestão do Sistema
                                            </span>
                                          </div>
                                          <p className="text-sm text-blue-700 dark:text-blue-300">
                                            Baseado em suas qualificações, sugerimos: <strong>{statusLabels[competencyData.suggestedStatus as CompetencyStatus]}</strong>
                                          </p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => updateCompetencyMutation.mutate({ 
                                            competencyId, 
                                            status: competencyData.suggestedStatus as CompetencyStatus,
                                            notes
                                          })}
                                          className="ml-2"
                                          data-testid={`button-accept-suggestion-${competencyId}`}
                                        >
                                          Aceitar
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  {notes && !isEditing && (
                                    <p className="text-sm text-muted-foreground mt-2" data-testid={`text-competency-notes-${competencyId}`}>
                                      {notes}
                                    </p>
                                  )}
                                  {isEditing && (
                                    <div className="mt-2 space-y-2">
                                      <Textarea
                                        value={tempNotes}
                                        onChange={(e) => setTempNotes(e.target.value)}
                                        placeholder="Adicione notas sobre seu progresso..."
                                        rows={2}
                                      />
                                      <div className="flex space-x-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            updateCompetencyMutation.mutate({ 
                                              competencyId, 
                                              status,
                                              notes: tempNotes
                                            });
                                            setEditingCompetency(null);
                                          }}
                                        >
                                          Salvar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingCompetency(null);
                                            setTempNotes("");
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  {!isEditing && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setTempNotes(notes);
                                        setEditingCompetency(competencyId);
                                      }}
                                      className="mt-2"
                                    >
                                      {notes ? 'Editar Notas' : 'Adicionar Notas'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Qualifications Tab */}
            <TabsContent value="qualifications" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <GraduationCap className="h-5 w-5" />
                        <span>Qualificações</span>
                      </CardTitle>
                      <CardDescription>
                        Gerencie suas qualificações e certificações formais
                      </CardDescription>
                    </div>
                    <Dialog open={qualificationDialogOpen} onOpenChange={setQualificationDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-qualification">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Qualificação</DialogTitle>
                          <DialogDescription>
                            Registre uma nova qualificação ou certificação formal
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="qual-course">Título do Curso</Label>
                            <Input
                              id="qual-course"
                              value={newQualCourseTitle}
                              onChange={(e) => setNewQualCourseTitle(e.target.value)}
                              placeholder="Ex: Certificação em TBO"
                              data-testid="input-course-title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="qual-institution">Instituição</Label>
                            <Input
                              id="qual-institution"
                              value={newQualInstitution}
                              onChange={(e) => setNewQualInstitution(e.target.value)}
                              placeholder="Ex: JOCUM/YWAM"
                              data-testid="input-institution"
                            />
                          </div>
                          <div>
                            <Label htmlFor="qual-completion">Data de Conclusão</Label>
                            <Input
                              id="qual-completion"
                              type="date"
                              value={newQualCompletionDate}
                              onChange={(e) => setNewQualCompletionDate(e.target.value)}
                              data-testid="input-completion-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="qual-credential">Credencial (opcional)</Label>
                            <Input
                              id="qual-credential"
                              value={newQualCredential}
                              onChange={(e) => setNewQualCredential(e.target.value)}
                              placeholder="Ex: Certificado, Diploma"
                              data-testid="input-credential"
                            />
                          </div>
                          <div>
                            <Label htmlFor="qual-description">Descrição (opcional)</Label>
                            <Textarea
                              id="qual-description"
                              value={newQualDescription}
                              onChange={(e) => setNewQualDescription(e.target.value)}
                              placeholder="Breve descrição do conteúdo..."
                              rows={3}
                              data-testid="input-description"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => createQualificationMutation.mutate({
                              courseTitle: newQualCourseTitle,
                              institution: newQualInstitution,
                              completionDate: newQualCompletionDate,
                              credential: newQualCredential || undefined,
                              description: newQualDescription || undefined
                            })}
                            disabled={!newQualCourseTitle.trim() || !newQualInstitution.trim() || !newQualCompletionDate || createQualificationMutation.isPending}
                            data-testid="button-confirm-add-qualification"
                          >
                            {createQualificationMutation.isPending ? "Adicionando..." : "Adicionar Qualificação"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingQualifications ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : qualifications.length === 0 ? (
                    <div className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhuma qualificação ainda</p>
                      <p className="text-xs text-muted-foreground">Adicione sua primeira qualificação</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {qualifications.map((qualification) => (
                        <Card key={qualification.id} data-testid={`card-qualification-${qualification.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Award className="h-5 w-5 text-primary" />
                                  <h3 className="font-medium" data-testid={`text-course-title-${qualification.id}`}>
                                    {qualification.courseTitle}
                                  </h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2" data-testid={`text-institution-${qualification.id}`}>
                                  {qualification.institution}
                                </p>
                                <div className="flex items-center space-x-3 text-sm mb-2">
                                  {qualification.credential && (
                                    <Badge>{qualification.credential}</Badge>
                                  )}
                                  {qualification.completionDate && (
                                    <span className="text-muted-foreground" data-testid={`text-completion-date-${qualification.id}`}>
                                      {new Date(qualification.completionDate).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                                {qualification.description && (
                                  <p className="text-sm text-muted-foreground" data-testid={`text-description-${qualification.id}`}>
                                    {qualification.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteQualificationMutation.mutate(qualification.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-qualification-${qualification.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-5" />
                        <span>Atividades e Experiências</span>
                      </CardTitle>
                      <CardDescription>
                        Registre traduções e outras experiências de trabalho (a IA pode adicionar experiências gerais)
                      </CardDescription>
                    </div>
                    <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-activity">
                          <Plus className="h-4 w-4 mr-2" />
                          Registrar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Registrar Atividade</DialogTitle>
                          <DialogDescription>
                            Registre uma nova atividade de tradução bíblica
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="activity-language">Nome do Idioma</Label>
                            <Input
                              id="activity-language"
                              value={newActivityLanguage}
                              onChange={(e) => setNewActivityLanguage(e.target.value)}
                              placeholder="Ex: Karajá, Yanomami"
                              data-testid="input-language-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="activity-chapters">Quantidade de Capítulos</Label>
                            <Input
                              id="activity-chapters"
                              type="number"
                              min="1"
                              value={newActivityChapters}
                              onChange={(e) => setNewActivityChapters(e.target.value)}
                              data-testid="input-chapters-count"
                            />
                          </div>
                          <div>
                            <Label htmlFor="activity-date">Data da Atividade</Label>
                            <Input
                              id="activity-date"
                              type="date"
                              value={newActivityDate}
                              onChange={(e) => setNewActivityDate(e.target.value)}
                              data-testid="input-activity-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="activity-notes">Notas (opcional)</Label>
                            <Textarea
                              id="activity-notes"
                              value={newActivityNotes}
                              onChange={(e) => setNewActivityNotes(e.target.value)}
                              placeholder="Contexto adicional sobre a atividade..."
                              rows={4}
                              data-testid="input-activity-notes"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => createActivityMutation.mutate({
                              languageName: newActivityLanguage,
                              chaptersCount: parseInt(newActivityChapters),
                              activityDate: newActivityDate,
                              notes: newActivityNotes || undefined
                            })}
                            disabled={!newActivityLanguage.trim() || !newActivityDate || !newActivityChapters || createActivityMutation.isPending}
                            data-testid="button-confirm-add-activity"
                          >
                            {createActivityMutation.isPending ? "Registrando..." : "Registrar Atividade"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingActivities ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
                      <p className="text-xs text-muted-foreground">Registre sua primeira atividade de tradução</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <Card key={activity.id} data-testid={`card-activity-${activity.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Translation Activity */}
                                {(activity.activityType === 'translation' || !activity.activityType) && (
                                  <>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Calendar className="h-5 w-5 text-primary" />
                                      <h3 className="font-medium" data-testid={`text-language-name-${activity.id}`}>
                                        {activity.languageName}
                                      </h3>
                                    </div>
                                    <div className="flex items-center space-x-3 text-sm mb-2">
                                      <Badge>{activity.chaptersCount} capítulo(s)</Badge>
                                      {activity.activityDate && (
                                        <span className="text-muted-foreground" data-testid={`text-activity-date-${activity.id}`}>
                                          {new Date(activity.activityDate).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                    </div>
                                    {activity.notes && (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-activity-notes-${activity.id}`}>
                                        {activity.notes}
                                      </p>
                                    )}
                                  </>
                                )}

                                {/* General Experience Activity */}
                                {activity.activityType && activity.activityType !== 'translation' && (
                                  <>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Calendar className="h-5 w-5 text-primary" />
                                      <h3 className="font-medium" data-testid={`text-activity-title-${activity.id}`}>
                                        {activity.title || 'Experiência Profissional'}
                                      </h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                                      <Badge variant="outline">
                                        {activity.activityType === 'facilitation' ? 'Facilitação' :
                                         activity.activityType === 'teaching' ? 'Ensino' :
                                         activity.activityType === 'indigenous_work' ? 'Trabalho com Povos' :
                                         activity.activityType === 'school_work' ? 'Trabalho Escolar' :
                                         'Experiência Geral'}
                                      </Badge>
                                      {activity.organization && (
                                        <span className="text-muted-foreground" data-testid={`text-organization-${activity.id}`}>
                                          {activity.organization}
                                        </span>
                                      )}
                                      {activity.yearsOfExperience && (
                                        <span className="text-muted-foreground">
                                          {activity.yearsOfExperience} {activity.yearsOfExperience === 1 ? 'ano' : 'anos'}
                                        </span>
                                      )}
                                      {activity.activityDate && (
                                        <span className="text-muted-foreground" data-testid={`text-activity-date-${activity.id}`}>
                                          {new Date(activity.activityDate).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                    </div>
                                    {activity.description && (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-activity-description-${activity.id}`}>
                                        {activity.description}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteActivityMutation.mutate(activity.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-activity-${activity.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span>Relatórios Trimestrais</span>
                      </CardTitle>
                      <CardDescription>
                        Gere e visualize relatórios trimestrais de progresso
                      </CardDescription>
                    </div>
                    <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-generate-report">
                          <Plus className="h-4 w-4 mr-2" />
                          Gerar Relatório
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Gerar Relatório Trimestral</DialogTitle>
                          <DialogDescription>
                            Selecione o período para o relatório
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="report-start">Início do Período</Label>
                            <Input
                              id="report-start"
                              type="date"
                              value={reportPeriodStart}
                              onChange={(e) => setReportPeriodStart(e.target.value)}
                              data-testid="input-period-start"
                            />
                          </div>
                          <div>
                            <Label htmlFor="report-end">Fim do Período</Label>
                            <Input
                              id="report-end"
                              type="date"
                              value={reportPeriodEnd}
                              onChange={(e) => setReportPeriodEnd(e.target.value)}
                              data-testid="input-period-end"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => generateReportMutation.mutate({
                              periodStart: reportPeriodStart,
                              periodEnd: reportPeriodEnd
                            })}
                            disabled={!reportPeriodStart || !reportPeriodEnd || generateReportMutation.isPending}
                            data-testid="button-confirm-generate-report"
                          >
                            {generateReportMutation.isPending ? "Gerando..." : "Gerar Relatório"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingReports ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">Nenhum relatório ainda</p>
                      <p className="text-xs text-muted-foreground">Gere seu primeiro relatório trimestral</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((report) => {
                        const reportData = report.reportData as any;
                        return (
                          <Card key={report.id} data-testid={`card-report-${report.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <h3 className="font-medium" data-testid={`text-report-period-${report.id}`}>
                                      Relatório: {new Date(report.periodStart).toLocaleDateString('pt-BR')} - {new Date(report.periodEnd).toLocaleDateString('pt-BR')}
                                    </h3>
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-3">
                                    Gerado em: {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('pt-BR') : 'N/A'}
                                  </div>
                                  
                                  {selectedReport?.id === report.id && reportData && (
                                    <div className="mt-4 space-y-4 border-t pt-4">
                                      {/* Summary */}
                                      <div>
                                        <h4 className="font-medium mb-2">Resumo</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Competências Concluídas:</span>{' '}
                                            <span className="font-medium">{reportData.summary?.completedCompetencies || 0} / {reportData.summary?.totalCompetencies || 0}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Qualificações:</span>{' '}
                                            <span className="font-medium">{reportData.summary?.totalQualifications || 0}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Atividades:</span>{' '}
                                            <span className="font-medium">{reportData.summary?.totalActivities || 0}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Capítulos Traduzidos:</span>{' '}
                                            <span className="font-medium">{reportData.summary?.totalChapters || 0}</span>
                                          </div>
                                        </div>
                                        {reportData.summary?.languages && reportData.summary.languages.length > 0 && (
                                          <div className="mt-2">
                                            <span className="text-sm text-muted-foreground">Idiomas:</span>{' '}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {reportData.summary.languages.map((lang: string, idx: number) => (
                                                <Badge key={idx} variant="secondary">{lang}</Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Competencies */}
                                      {reportData.competencies && reportData.competencies.length > 0 && (
                                        <div>
                                          <h4 className="font-medium mb-2">Competências ({reportData.competencies.length})</h4>
                                          <div className="space-y-1 text-sm">
                                            {reportData.competencies.slice(0, 5).map((comp: any, idx: number) => (
                                              <div key={idx} className="flex justify-between">
                                                <span>{getCompetencyName(comp.competencyId as CompetencyId)}</span>
                                                <Badge variant="outline" className="text-xs">
                                                  {statusLabels[comp.status as CompetencyStatus]}
                                                </Badge>
                                              </div>
                                            ))}
                                            {reportData.competencies.length > 5 && (
                                              <p className="text-xs text-muted-foreground italic">
                                                +{reportData.competencies.length - 5} mais...
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Activities */}
                                      {reportData.activities && reportData.activities.length > 0 && (
                                        <div>
                                          <h4 className="font-medium mb-2">Atividades do Período ({reportData.activities.length})</h4>
                                          <div className="space-y-1 text-sm">
                                            {reportData.activities.slice(0, 3).map((act: any, idx: number) => (
                                              <div key={idx} className="flex justify-between">
                                                <span>{act.languageName}</span>
                                                <span className="text-muted-foreground">{act.chaptersCount} cap.</span>
                                              </div>
                                            ))}
                                            {reportData.activities.length > 3 && (
                                              <p className="text-xs text-muted-foreground italic">
                                                +{reportData.activities.length - 3} mais...
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex space-x-2 mt-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                                      data-testid={`button-toggle-report-${report.id}`}
                                    >
                                      {selectedReport?.id === report.id ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={async () => {
                                        try {
                                          const response = await fetch(`/api/facilitator/reports/${report.id}/download`, {
                                            credentials: 'include',
                                          });
                                          
                                          if (!response.ok) {
                                            throw new Error('Falha ao baixar relatório');
                                          }
                                          
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `relatorio-${new Date(report.periodStart).toISOString().split('T')[0]}.docx`;
                                          document.body.appendChild(a);
                                          a.click();
                                          window.URL.revokeObjectURL(url);
                                          document.body.removeChild(a);
                                        } catch (error) {
                                          toast({
                                            title: "Erro",
                                            description: "Não foi possível baixar o relatório",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                      data-testid={`button-download-report-${report.id}`}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Baixar .docx
                                    </Button>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteReportMutation.mutate(report.id)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-report-${report.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
