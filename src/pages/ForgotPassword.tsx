import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { requestPasswordReset } from '@/lib/api/users';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      toast({
        title: 'Email envoyé',
        description: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'envoyer l'email. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sidebar-primary rounded-xl flex items-center justify-center">
              <img src="/secea-logo.svg" alt="S.N.E.C.E.A" className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-sidebar-foreground">S.N.E.C.E.A</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            S.N.E.C.E.A
          </h1>
          <p className="text-lg text-sidebar-foreground/80">
            Votre plateforme de suivi des requêtes syndicales. Soumettez, suivez et gérez vos demandes en toute simplicité.
          </p>
        </div>

        <p className="text-sm text-sidebar-foreground/60">
          © 2026 S.N.E.C.E.A. Tous droits réservés.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <img src="/secea-logo.svg" alt="S.N.E.C.E.A" className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold">S.N.E.C.E.A</span>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold">Mot de passe oublié</h2>
            <p className="text-muted-foreground mt-2">
              Saisissez votre adresse email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Email envoyé !</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Pensez à vérifier vos spams si vous ne trouvez pas l'email.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSent(false); setEmail(''); }}
              >
                Renvoyer un email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !email.trim()}>
                {isLoading ? (
                  'Envoi en cours...'
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer le lien
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
