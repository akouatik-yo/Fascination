package android.webkit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/* Copie de l'annotation d'Android (API 17), seulement pour compiler contre l'android.jar de l'API 16.
   Elle n'entre pas dans l'APK : sur l'appareil, c'est celle du système qui est utilisée. */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface JavascriptInterface {}
