import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Redirect back to the page the user came from, or default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { role } = await login(formData.email, formData.password);

      toast({
        title: 'Connexion réussie',
        description: `Bienvenue sur la plateforme SNECEA. Rôle : ${role}`,
      });

      navigate(from, { replace: true });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Échec de connexion',
        description: err instanceof Error ? err.message : 'Identifiants incorrects.',
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

      {/* Right panel - Login form */}
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
            <h2 className="text-2xl font-bold">Connexion</h2>
            <p className="text-muted-foreground mt-2">
              Accédez à votre espace adhérent
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                'Connexion...'
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
