package com.kartaonica.zandar;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugini iz samog projekta se prijavljuju PRIJE super.onCreate — tamo
        // se diže bridge, i kasnija prijava ga više ne stiže.
        registerPlugin(InstallReferrerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
