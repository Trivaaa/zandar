package com.kartaonica.zandar;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Otvara sistemska podešavanja obavještenja ove aplikacije (SPEC_PUSH_V2 A3).
 *
 * Na Androidu 13+ poslije „Ne dozvoli" aplikacija ne može ponovo pokazati
 * sistemski dijalog — jedini put nazad je ekran podešavanja. `open` NIKAD ne
 * odbija: ako ekran obavještenja ne postoji (stari Android, čudan proizvođač),
 * otvara opšti ekran aplikacije, a ako ni to ne uspije, vraća `opened: false`.
 */
@CapacitorPlugin(name = "NotificationSettings")
public class NotificationSettingsPlugin extends Plugin {

    /**
     * Verzija Androida i da li su obavještenja aplikacije uključena — samo za
     * analitiku (od 1.5.2): bez verzije se ne razlikuje Android ≤ 12, gdje
     * dozvola stiže sama, od pravog „Dozvoli" na 13+.
     */
    @PluginMethod
    public void info(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sdkInt", Build.VERSION.SDK_INT);
        result.put("enabled", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void open(PluginCall call) {
        String pkg = getContext().getPackageName();
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(Uri.fromParts("package", pkg, null));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        JSObject result = new JSObject();
        try {
            getContext().startActivity(intent);
            result.put("opened", true);
        } catch (Exception first) {
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.fromParts("package", pkg, null))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                result.put("opened", true);
            } catch (Exception second) {
                result.put("opened", false);
            }
        }
        call.resolve(result);
    }
}
