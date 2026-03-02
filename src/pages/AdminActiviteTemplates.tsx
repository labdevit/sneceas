import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActiviteTemplateList } from '@/components/activites-dynamiques/ActiviteTemplateList';

export default function AdminActiviteTemplates() {
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Modèles d&apos;activité</CardTitle>
          <CardDescription>
            Créez des modèles d&apos;activité avec champs personnalisés et assignez-les aux pôles.
            Lors du traitement d&apos;une requête, seules les activités assignées au pôle de la
            requête seront proposées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiviteTemplateList />
        </CardContent>
      </Card>
    </div>
  );
}
