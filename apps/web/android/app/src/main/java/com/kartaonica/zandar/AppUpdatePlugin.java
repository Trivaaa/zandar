package com.kartaonica.zandar;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * Play In-App Updates: aplikacija sama nudi (ili traži) noviju verziju sa Play-a.
 *
 * Odluku šta pokazati donosi JS (`apps/web/lib/appUpdate.ts`) — ovdje su samo
 * Play pozivi. Kao InstallReferrer, `check` NIKAD ne odbija: instalacija van
 * Play-a (staging, debug, sideload), uređaj bez Play Services ili greška mreže
 * daju `available: false`, pa aplikacija radi kao i do sad.
 *
 * Preuzimanje u pozadini (flexible) javlja kraj događajem `downloaded`; JS tad
 * nudi „Restartuj" (`completeUpdate`), ali samo van stola.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private AppUpdateManager manager;

    private final InstallStateUpdatedListener installListener = state -> {
        if (state.installStatus() == InstallStatus.DOWNLOADED) {
            notifyListeners("downloaded", new JSObject());
        }
    };

    @Override
    public void load() {
        try {
            manager = AppUpdateManagerFactory.create(getContext());
            manager.registerListener(installListener);
        } catch (Exception e) {
            manager = null; // bez Play Services: check vraća available:false
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (manager != null) {
            try {
                manager.unregisterListener(installListener);
            } catch (Exception ignored) {
                // već odjavljen
            }
        }
        super.handleOnDestroy();
    }

    /** Instalirana verzija — JS je poredi sa minimumom sa servera. */
    private long currentVersionCode() {
        try {
            PackageInfo info = getContext().getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? info.getLongVersionCode()
                : info.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            return 0;
        }
    }

    @PluginMethod
    public void check(final PluginCall call) {
        final JSObject result = new JSObject();
        result.put("available", false);
        result.put("currentVersionCode", currentVersionCode());
        if (manager == null) {
            call.resolve(result);
            return;
        }
        try {
            manager.getAppUpdateInfo()
                .addOnSuccessListener(info -> {
                    int availability = info.updateAvailability();
                    // DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS = prisila prekinuta
                    // (aplikacija ugašena usred Play ekrana) — nastavlja se.
                    boolean available = availability == UpdateAvailability.UPDATE_AVAILABLE
                        || availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                    result.put("available", available);
                    result.put("availableVersionCode", info.availableVersionCode());
                    result.put("flexibleAllowed", info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE));
                    result.put("immediateAllowed", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
                    result.put("downloaded", info.installStatus() == InstallStatus.DOWNLOADED);
                    Integer staleness = info.clientVersionStalenessDays();
                    if (staleness != null) result.put("stalenessDays", staleness);
                    call.resolve(result);
                })
                .addOnFailureListener(e -> call.resolve(result));
        } catch (Exception e) {
            call.resolve(result);
        }
    }

    @PluginMethod
    public void startFlexible(final PluginCall call) {
        start(call, AppUpdateType.FLEXIBLE);
    }

    @PluginMethod
    public void startImmediate(final PluginCall call) {
        start(call, AppUpdateType.IMMEDIATE);
    }

    /**
     * `AppUpdateInfo` je jednokratan za pokretanje toka, pa se uzima svjež.
     * Vraća `{ started }` — Play ekran je otvoren. Ishod flexible preuzimanja
     * stiže kao `downloaded`; otkazana prisila se vidi sljedećim `check`-om.
     */
    private void start(final PluginCall call, final int type) {
        final JSObject result = new JSObject();
        result.put("started", false);
        if (manager == null || getActivity() == null) {
            call.resolve(result);
            return;
        }
        try {
            manager.getAppUpdateInfo()
                .addOnSuccessListener(info -> {
                    if (!canStart(info, type)) {
                        call.resolve(result);
                        return;
                    }
                    try {
                        manager.startUpdateFlow(info, getActivity(), AppUpdateOptions.newBuilder(type).build());
                        result.put("started", true);
                    } catch (Exception ignored) {
                        // aktivnost nestala usred poziva
                    }
                    call.resolve(result);
                })
                .addOnFailureListener(e -> call.resolve(result));
        } catch (Exception e) {
            call.resolve(result);
        }
    }

    private static boolean canStart(AppUpdateInfo info, int type) {
        int availability = info.updateAvailability();
        if (availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
            return type == AppUpdateType.IMMEDIATE;
        }
        return availability == UpdateAvailability.UPDATE_AVAILABLE && info.isUpdateTypeAllowed(type);
    }

    /** Instalira preuzeto; Play pritom restartuje aplikaciju. */
    @PluginMethod
    public void completeUpdate(final PluginCall call) {
        if (manager == null) {
            call.resolve();
            return;
        }
        try {
            manager.completeUpdate();
        } catch (Exception ignored) {
            // ništa preuzeto
        }
        call.resolve();
    }
}
