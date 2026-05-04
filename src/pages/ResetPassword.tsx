import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { confirmPasswordReset } from '@/lib/api/users';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const isValid = formData.password.length >= 8 && formData.password === formData.confirmPassword;
  const linkMissing = !uid || !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
      });
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(uid, token, formData.password);
      toast({
        title: 'Mot de passe modifié',
        description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
      });
      navigate('/login', { replace: true });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Lien invalide ou expiré. Veuillez refaire une demande.',
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
            <h2 className="text-2xl font-bold">Nouveau mot de passe</h2>
            <p className="text-muted-foreground mt-2">
              Choisissez un nouveau mot de passe pour votre compte
            </p>
          </div>

          {linkMissing ? (
            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Lien invalide. Veuillez refaire une demande de réinitialisation.
                </p>
              </div>
              <Link to="/forgot-password">
                <Button variant="outline" className="w-full">
                  Demander un nouveau lien
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password && formData.password.length < 8 && (
                  <p className="text-xs text-destructive mt-1">Minimum 8 caractères</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="mt-1.5"
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !isValid}>
                {isLoading ? (
                  'Modification en cours...'
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Modifier le mot de passe
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
