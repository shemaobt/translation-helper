import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2,
  Circle,
  Target,
  GraduationCap,
  Activity,
  FileText,
  User,
  Sparkles,
  Download,
  Calendar
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

interface AdminPortfolioProps {
  params: {
    userId: string;
  };
}

export default function AdminPortfolioView({ params }: AdminPortfolioProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("competencies");
  const userId = params.userId;

  // Fetch competencies for the user
  const { data: competencies = [], isLoading: loadingCompetencies } = useQuery<FacilitatorCompetency[]>({
    queryKey: ['/api/admin/users', userId, 'competencies'],
    enabled: isAuthenticated && !!userId
  });

  // Fetch qualifications for the user
  const { data: qualifications = [], isLoading: loadingQualifications } = useQuery<FacilitatorQualification[]>({
    queryKey: ['/api/admin/users', userId, 'qualifications'],
    enabled: isAuthenticated && !!userId
  });

  // Fetch activities for the user
  const { data: activities = [], isLoading: loadingActivities } = useQuery<MentorshipActivity[]>({
    queryKey: ['/api/admin/users', userId, 'activities'],
    enabled: isAuthenticated && !!userId
  });

  // Fetch reports for the user
  const { data: reports = [], isLoading: loadingReports } = useQuery<QuarterlyReport[]>({
    queryKey: ['/api/admin/users', userId, 'reports'],
    enabled: isAuthenticated && !!userId
  });

  // Fetch facilitator profile for the user
  const { data: facilitatorProfile, isLoading: loadingProfile } = useQuery<{ region: string | null; mentorSupervisor: string | null; totalLanguagesMentored?: number; totalChaptersMentored?: number }>({
    queryKey: ['/api/admin/users', userId, 'profile'],
    enabled: isAuthenticated && !!userId
  });

  // Calculate competency progress
  const competencyProgress = Object.keys(CORE_COMPETENCIES).length > 0
    ? (competencies.filter(c => c.status === 'proficient' || c.status === 'advanced').length / Object.keys(CORE_COMPETENCIES).length) * 100
    : 0;

  // Get status for a competency
  const getCompetencyStatus = (competencyId: CompetencyId): CompetencyStatus => {
    const competency = competencies.find(c => c.competencyId === competencyId);
    return (competency?.status as CompetencyStatus) || 'not_started';
  };

  // Get competency data object
  const getCompetencyData = (competencyId: CompetencyId) => {
    return competencies.find(c => c.competencyId === competencyId);
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
    <div className="h-screen bg-background flex relative overflow-hidden" data-testid="page-admin-portfolio">
      <div className="h-screen w-80">
        <Sidebar isMobile={isMobile} isOpen={true} />
      </div>
      
      <div className={`flex-1 h-screen overflow-y-auto ${isMobile ? 'p-4' : 'p-8'}`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
          {/* Header */}
          <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
              Portfólio do Facilitador (Admin View)
            </h1>
            <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : ''}`}>
              Visualização somente leitura do portfólio do facilitador
            </p>
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
            <TabsList className="grid w-full grid-cols-4">
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

            {/* Competencies Tab */}
            <TabsContent value="competencies" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Competências Principais</span>
                  </CardTitle>
                  <CardDescription>
                    Competências de facilitação TBO
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
                        const competencyData = getCompetencyData(competencyId);

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
                                  <div className="flex items-center space-x-2">
                                    <Badge className={statusColors[status]}>
                                      {statusLabels[status]}
                                    </Badge>
                                  </div>
                                  {competencyData?.notes && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      {competencyData.notes}
                                    </p>
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
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5" />
                    <span>Qualificações</span>
                  </CardTitle>
                  <CardDescription>
                    Qualificações e certificações formais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingQualifications ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : qualifications.length === 0 ? (
                    <div className="text-center py-8">
                      <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma qualificação registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {qualifications.map((qualification) => (
                        <Card key={qualification.id}>
                          <CardContent className="p-4">
                            <h3 className="font-medium text-foreground">{qualification.courseTitle}</h3>
                            <p className="text-sm text-muted-foreground">{qualification.institution}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              {qualification.completionDate && (
                                <Badge variant="outline">
                                  {new Date(qualification.completionDate).toLocaleDateString()}
                                </Badge>
                              )}
                              {qualification.credential && (
                                <Badge>{qualification.credential}</Badge>
                              )}
                            </div>
                            {qualification.description && (
                              <p className="text-sm text-muted-foreground mt-2">{qualification.description}</p>
                            )}
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
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Atividades e Experiências</span>
                  </CardTitle>
                  <CardDescription>
                    Registro de trabalho de tradução e experiências gerais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingActivities ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <Card key={activity.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Translation Activity */}
                                {(activity.activityType === 'translation' || !activity.activityType) && (
                                  <>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Calendar className="h-5 w-5 text-primary" />
                                      <h3 className="font-medium text-foreground">{activity.languageName}</h3>
                                    </div>
                                    <div className="flex items-center space-x-3 text-sm mb-2">
                                      <Badge>{activity.chaptersCount} capítulo(s)</Badge>
                                      {activity.activityDate && (
                                        <span className="text-muted-foreground">
                                          {new Date(activity.activityDate).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                    </div>
                                    {activity.notes && (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activity.notes}</p>
                                    )}
                                  </>
                                )}

                                {/* General Experience Activity */}
                                {activity.activityType && activity.activityType !== 'translation' && (
                                  <>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Calendar className="h-5 w-5 text-primary" />
                                      <h3 className="font-medium text-foreground">
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
                                        <span className="text-muted-foreground">{activity.organization}</span>
                                      )}
                                      {activity.yearsOfExperience && (
                                        <span className="text-muted-foreground">
                                          {activity.yearsOfExperience} {activity.yearsOfExperience === 1 ? 'ano' : 'anos'}
                                        </span>
                                      )}
                                      {activity.activityDate && (
                                        <span className="text-muted-foreground">
                                          {new Date(activity.activityDate).toLocaleDateString('pt-BR')}
                                        </span>
                                      )}
                                    </div>
                                    {activity.description && (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{activity.description}</p>
                                    )}
                                  </>
                                )}
                              </div>
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
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Relatórios Trimestrais</span>
                  </CardTitle>
                  <CardDescription>
                    Relatórios de avaliação gerados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingReports ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum relatório gerado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((report) => (
                        <Card key={report.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-foreground mb-1">
                                  Relatório {new Date(report.periodStart).toLocaleDateString('pt-BR')} - {new Date(report.periodEnd).toLocaleDateString('pt-BR')}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Gerado em {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('pt-BR') : 'Data desconhecida'}
                                </p>
                                <div className="mt-3">
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
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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
