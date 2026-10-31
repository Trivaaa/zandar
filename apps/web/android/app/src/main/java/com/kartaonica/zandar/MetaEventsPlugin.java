package com.kartaonica.zandar;

import android.app.Application;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsConstants;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Meta App Events: instalacija i otvaranje, samo uz saglasnost igrača.
 *
 * FacebookInitProvider je izbačen iz manifesta, jer bi inače SDK dizao pri
 * svakom pokretanju procesa, prije saglasnosti (AutoInitEnabled=false ga ne
 * zaustavlja: blokira tek odgovor na zahtjev). Ovaj fajl je zato JEDINO mjesto
 * koje pokreće SDK. Neuspjeh se samo zapiše: bez mjerenja igra radi isto.
 *
 * SDK koji radi nema javni način gašenja (i sa ugašenim logovanjem dohvata svoje
 * postavke), pa povlačenje saglasnosti ponovo pokreće aplikaciju: novi proces SDK
 * više ne diže. Izmjereno ponašanje i ograničenja: docs/analytics.md.
 */
@CapacitorPlugin(name = "MetaEvents")
public class MetaEventsPlugin extends Plugin {

    private static final String TAG = "MetaEvents";
    private static final String PREFS = "meta_events";
    private static final String KEY_CONSENT = "consent";
    private static final String GRANTED = "granted";
    private static final String DENIED = "denied";
    private static final String UNSET = "unset";
    // Staging ima isti prompt i čuva izbor, ali ne šalje ništa u Meta projekat.
    private static final String PRODUCTION_PACKAGE = "com.kartaonica.zandar";
    private static final long RESTART_DELAY_MS = 3000;

    /** MainActivity, PRIJE super.onCreate: tracker mora vidjeti prvi resume. */
    static void startIfConsented(Context context) {
        if (GRANTED.equals(readConsent(context))) start(context);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void setConsent(PluginCall call) {
        boolean granted = Boolean.TRUE.equals(call.getBoolean("granted", false));
        // commit, ne apply: poslije povlačenja proces završava.
        getContext()
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_CONSENT, granted ? GRANTED : DENIED)
            .commit();
        if (granted) {
            grant();
        } else if (FacebookSdk.isInitialized()) {
            // Događaji staju odmah, a proces završava tek kad WebView stigne da
            // upiše localStorage (izmjereno: upis mlađi od ~1 s se gubi).
            AppEventsLogger.setFlushBehavior(AppEventsLogger.FlushBehavior.EXPLICIT_ONLY);
            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(getContext(), R.string.meta_restarting, Toast.LENGTH_LONG).show();
                new Handler(Looper.getMainLooper()).postDelayed(this::restartApp, RESTART_DELAY_MS);
            });
        }
        call.resolve(status());
    }

    private JSObject status() {
        JSObject result = new JSObject();
        result.put("consent", readConsent(getContext()));
        return result;
    }

    private static String readConsent(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_CONSENT, UNSET);
    }

    private void grant() {
        Context context = getContext();
        if (!start(context)) return;
        try {
            // Aktivnost je već prošla resume, pa tracker ovo otvaranje ne vidi.
            AppEventsLogger
                .newLogger(context.getApplicationContext())
                .logEvent(AppEventsConstants.EVENT_NAME_ACTIVATED_APP);
        } catch (Exception e) {
            Log.w(TAG, "Prvo otvaranje nije zapisano", e);
        }
    }

    private void restartApp() {
        Context context = getContext();
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            context.startActivity(launch);
        }
        Runtime.getRuntime().exit(0);
    }

    // sdkInitialize je zastario jer ga inače zove provider koji smo izbacili.
    @SuppressWarnings("deprecation")
    private static boolean start(Context context) {
        if (!PRODUCTION_PACKAGE.equals(context.getPackageName())) return false;
        try {
            // Instalaciju i tracker pokreće sam SDK, čim učita postavke.
            FacebookSdk.sdkInitialize((Application) context.getApplicationContext());
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Pokretanje SDK-a", e);
            return false;
        }
    }
}
