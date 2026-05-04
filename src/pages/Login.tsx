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
    identifier: '',
    password: '',
  });

  // Redirect back to the page the user came from, or default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { user } = await login(formData.identifier, formData.password);

      const roleName = user.is_superuser
        ? 'Super Admin'
        : user.roles?.[0]?.role_name ?? 'Utilisateur';

      toast({
        title: 'Connexion réussie',
        description: `Bienvenue ${user.name || user.username}. Rôle : ${roleName}`,
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
        {/* Logo complet en haut */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <img
              src="/snecea-logo.svg"
              alt="S.N.E.C.E.A"
              className="w-20 h-20 drop-shadow-lg"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <p className="text-3xl font-black tracking-widest text-white leading-none">
                S.N.E.C.E.A
              </p>
              <div className="h-0.5 bg-white/40 mt-1 mb-1.5" />
              <p className="text-xs text-white/70 leading-snug max-w-[220px]">
                Syndicat National des Employés et<br />Cadres des Entreprises d'Assurances
              </p>
            </div>
          </div>
        </div>

        {/* Message central */}
        <div className="space-y-5">
          <div className="w-12 h-1 bg-white/40 rounded-full" />
          <h1 className="text-4xl font-bold text-white leading-tight">
            Bienvenue sur votre<br />espace adhérent
          </h1>
          <p className="text-base text-white/75 leading-relaxed">
            Soumettez, suivez et gérez vos requêtes syndicales en toute simplicité. Votre syndicat à portée de main.
          </p>
          <div className="flex gap-6 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-white/60 mt-0.5">Sécurisé</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-xs text-white/60 mt-0.5">Disponible</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">CNTS</p>
              <p className="text-xs text-white/60 mt-0.5">Affilié</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/40">
          © 2026 S.N.E.C.E.A — Tous droits réservés
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-md">
                <img src="/snecea-logo.svg" alt="S.N.E.C.E.A"
                  className="w-9 h-9"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <span className="text-xl font-black tracking-widest text-foreground">S.N.E.C.E.A</span>
              <span className="text-xs text-muted-foreground text-center leading-snug">
                Syndicat National des Employés et<br />Cadres des Entreprises d'Assurances
              </span>
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
              <Label htmlFor="identifier">Nom d'utilisateur ou Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="nom.utilisateur ou votre.email@example.com"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
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
