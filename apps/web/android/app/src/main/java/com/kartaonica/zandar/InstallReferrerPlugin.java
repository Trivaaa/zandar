package com.kartaonica.zandar;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Play Install Referrer: string koji je stajao u referrer= parametru Play
 * linka sa kojeg je aplikacija instalirana. Web traka u njega upisuje sobu iz
 * pozivnice (room=<id>), pa igrač poslije instalacije sleti na tu sobu.
 *
 * Plugin samo vraća sirov string — tumači ga i čuva "pročitano" JS
 * (apps/web/lib/installReferrer.ts). Svaki neuspjeh se rješava praznim
 * odgovorom, nikad odbijanjem: bez referrera aplikacija se ponaša kao i do sad.
 */
@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrerPlugin extends Plugin {

    @PluginMethod
    public void getReferrer(final PluginCall call) {
        // Listener se može javiti i dvaput (setup pa disconnect) — poziv se
        // smije razriješiti samo jednom.
        final AtomicBoolean done = new AtomicBoolean(false);
        try {
            final InstallReferrerClient client =
                InstallReferrerClient.newBuilder(getContext()).build();
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    if (!done.compareAndSet(false, true)) return;
                    JSObject result = new JSObject();
                    try {
                        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                            result.put("referrer", client.getInstallReferrer().getInstallReferrer());
                        }
                    } catch (Exception ignored) {
                        // RemoteException / servis nestao usred čitanja → prazan odgovor.
                    } finally {
                        try {
                            client.endConnection();
                        } catch (Exception ignored) {
                            // već zatvoreno
                        }
                    }
                    call.resolve(result);
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    if (done.compareAndSet(false, true)) call.resolve(new JSObject());
                }
            });
        } catch (Exception e) {
            // Uređaj bez Play Store-a ili odbijeno vezivanje servisa.
            if (done.compareAndSet(false, true)) call.resolve(new JSObject());
        }
    }
}
