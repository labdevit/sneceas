import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResendEmailRequest {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

async function sendEmail(emailData: ResendEmailRequest) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailData),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
  
  return response.json();
}

interface ActivityNotificationRequest {
  recipientEmail: string;
  recipientName: string;
  ticketReference: string;
  ticketSubject: string;
  activityType: 'call' | 'meeting' | 'document' | 'note';
  activityTitle: string;
  activityDate: string;
  notificationType: 'planned' | 'completed';
  completionComment?: string;
}

const activityTypeLabels: Record<string, string> = {
  call: 'Appel téléphonique',
  meeting: 'Rendez-vous',
  document: 'Document',
  note: 'Note',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      ticketReference,
      ticketSubject,
      activityType,
      activityTitle,
      activityDate,
      notificationType,
      completionComment,
    }: ActivityNotificationRequest = await req.json();

    // Validate required fields
    if (!recipientEmail || !ticketReference || !activityType || !activityTitle || !notificationType) {
      throw new Error("Missing required fields");
    }

    const activityLabel = activityTypeLabels[activityType] || activityType;
    const formattedDate = new Date(activityDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let subject: string;
    let htmlContent: string;

    if (notificationType === 'planned') {
      subject = `[${ticketReference}] Nouvelle activité planifiée: ${activityLabel}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">SNECEA</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Syndicat National des Employés du Commerce et de l'Exploitation Aéronautique</p>
          </div>
          
          <div style="padding: 30px; background-color: #f8fafc;">
            <h2 style="color: #1a365d; margin-top: 0;">Nouvelle activité planifiée</h2>
            
            <p>Bonjour ${recipientName || 'Cher(e) adhérent(e)'},</p>
            
            <p>Une nouvelle activité a été planifiée pour votre requête :</p>
            
            <div style="background-color: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Référence :</strong> ${ticketReference}</p>
              <p style="margin: 0 0 10px 0;"><strong>Sujet :</strong> ${ticketSubject}</p>
              <p style="margin: 0 0 10px 0;"><strong>Type d'activité :</strong> ${activityLabel}</p>
              <p style="margin: 0 0 10px 0;"><strong>Titre :</strong> ${activityTitle}</p>
              <p style="margin: 0;"><strong>Date prévue :</strong> ${formattedDate}</p>
            </div>
            
            <p>Nous vous tiendrons informé(e) de l'avancement de cette activité.</p>
            
            <p>Cordialement,<br/>L'équipe SNECEA</p>
          </div>
          
          <div style="background-color: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">Cet email a été envoyé automatiquement par le système de gestion des requêtes SNECEA.</p>
          </div>
        </div>
      `;
    } else {
      subject = `[${ticketReference}] Activité terminée: ${activityLabel}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a365d; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">SNECEA</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Syndicat National des Employés du Commerce et de l'Exploitation Aéronautique</p>
          </div>
          
          <div style="padding: 30px; background-color: #f8fafc;">
            <h2 style="color: #16a34a; margin-top: 0;">✓ Activité terminée</h2>
            
            <p>Bonjour ${recipientName || 'Cher(e) adhérent(e)'},</p>
            
            <p>Une activité liée à votre requête vient d'être complétée :</p>
            
            <div style="background-color: white; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Référence :</strong> ${ticketReference}</p>
              <p style="margin: 0 0 10px 0;"><strong>Sujet :</strong> ${ticketSubject}</p>
              <p style="margin: 0 0 10px 0;"><strong>Type d'activité :</strong> ${activityLabel}</p>
              <p style="margin: 0 0 10px 0;"><strong>Titre :</strong> ${activityTitle}</p>
              <p style="margin: 0;"><strong>Complétée le :</strong> ${formattedDate}</p>
            </div>
            
            ${completionComment ? `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #16a34a;">Compte-rendu :</p>
                <p style="margin: 0; color: #166534;">${completionComment}</p>
              </div>
            ` : ''}
            
            <p>Vous pouvez consulter les détails de votre requête depuis votre espace personnel.</p>
            
            <p>Cordialement,<br/>L'équipe SNECEA</p>
          </div>
          
          <div style="background-color: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">Cet email a été envoyé automatiquement par le système de gestion des requêtes SNECEA.</p>
          </div>
        </div>
      `;
    }

    const emailResponse = await sendEmail({
      from: "SNECEA <noreply@snecea.sn>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Activity notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-activity-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
