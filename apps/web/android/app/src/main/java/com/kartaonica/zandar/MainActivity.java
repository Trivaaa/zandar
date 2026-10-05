package com.kartaonica.zandar;

import android.os.Bundle;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugini iz samog projekta se prijavljuju PRIJE super.onCreate — tamo
        // se diže bridge, i kasnija prijava ga više ne stiže.
        registerPlugin(InstallReferrerPlugin.class);
        super.onCreate(savedInstanceState);
        enterImmersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Sistem vraća trake kad prozor izgubi fokus (tastatura, dijalog za
        // dozvolu obavještenja, povratak iz pozadine) i ne sakriva ih sam.
        if (hasFocus) enterImmersive();
    }

    /**
     * Puni ekran: statusna traka i traka sa dugmadima su sakrivene, a potez sa
     * ivice ih pokaže nakratko. Capacitor (`SystemBars.hidden`) ih sakrije samo
     * jednom i ne postavlja ponašanje, pa bi prvi potez sa ivice trake vratio
     * trajno.
     */
    private void enterImmersive() {
        Window window = getWindow();
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
