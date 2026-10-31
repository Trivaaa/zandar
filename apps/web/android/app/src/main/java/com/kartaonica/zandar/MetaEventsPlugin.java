package com.kartaonica.zandar;

import android.app.Application;
import android.content.Context;
import android.util.Log;

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
 * Povlačenje: EXPLICIT_ONLY zaustavlja slanje događaja do kraja procesa, ali SDK
 * koji već radi može još dohvatati svoje postavke. Od sljedećeg pokretanja se više
 * ne diže. Izmjereno ponašanje i ograničenja: docs/analytics.md.
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
        getContext()
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_CONSENT, granted ? GRANTED : DENIED)
            .apply();
        if (granted) grant();
        else withdraw();
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
        try {
            // Aktivnost je već prošla resume, pa tracker ovo otvaranje ne vidi. SDK
            // koji već radi (povlačenje pa ponovo dozvola) ga je već vidio.
            boolean firstStart = !FacebookSdk.isInitialized();
            if (start(context) && firstStart) {
                AppEventsLogger
                    .newLogger(context.getApplicationContext())
                    .logEvent(AppEventsConstants.EVENT_NAME_ACTIVATED_APP);
            }
        } catch (Exception e) {
            Log.w(TAG, "Prvo otvaranje nije zapisano", e);
        }
    }

    private static void withdraw() {
        if (!FacebookSdk.isInitialized()) return;
        try {
            AppEventsLogger.setFlushBehavior(AppEventsLogger.FlushBehavior.EXPLICIT_ONLY);
            FacebookSdk.setAdvertiserIDCollectionEnabled(false);
        } catch (Exception e) {
            Log.w(TAG, "Povlačenje saglasnosti", e);
        }
    }

    // sdkInitialize je zastario jer ga inače zove provider koji smo izbacili.
    @SuppressWarnings("deprecation")
    private static boolean start(Context context) {
        if (!PRODUCTION_PACKAGE.equals(context.getPackageName())) return false;
        try {
            Application application = (Application) context.getApplicationContext();
            FacebookSdk.sdkInitialize(application);
            FacebookSdk.setAdvertiserIDCollectionEnabled(true);
            AppEventsLogger.setFlushBehavior(AppEventsLogger.FlushBehavior.AUTO);
            // Šalje instalaciju (jednom, sa ponovnim pokušajem na sljedećem pokretanju).
            AppEventsLogger.activateApp(application);
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Pokretanje SDK-a", e);
            return false;
        }
    }
}
