package com.midi.controller.keyboard;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.midi.controller.keyboard.plugins.NativeMidiPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // REGRA DO CAPACITOR: Registrar plugins ANTES do super.onCreate
        registerPlugin(NativeMidiPlugin.class);
        
        super.onCreate(savedInstanceState);
        
        // Aplica o Modo Imersivo logo na inicialização
        hideSystemUI();
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        // A API moderna do Android (recomendada para Android 11+)
        // Funciona nativamente em versões antigas também graças ao androidx
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        
        if (controller != null) {
            // Esconde as barras de status e navegação
            controller.hide(WindowInsetsCompat.Type.systemBars());
            
            // Define o comportamento "Sticky": a barra some, mas se o usuário deslizar,
            // ela aparece temporariamente.
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
}
