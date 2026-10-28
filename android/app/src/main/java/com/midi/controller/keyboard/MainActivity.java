package com.midi.controller.keyboard;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
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
        
        // Mantém a tela ligada enquanto o app está aberto (útil ao tocar)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Permite desenhar sob o recorte da câmera (notch / punch-hole)
        enableDrawUnderCutout();

        // Aplica o Modo Imersivo logo na inicialização
        hideSystemUI();
    }

    /**
     * Sem isso, o Android deixa uma faixa PRETA ao lado da câmera
     * (o modo padrão "default" faz letterbox em landscape).
     * Definir via código é mais confiável do que só pelo tema XML,
     * porque o Capacitor troca o tema depois do super.onCreate().
     */
    private void enableDrawUnderCutout() {
        // Cor de fundo da janela = cor do app (evita qualquer faixa preta)
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#0A0F1C"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // ALWAYS: usa o recorte em qualquer orientação (Android 11+)
                lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
            } else {
                lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            }
            getWindow().setAttributes(lp);
        }
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
