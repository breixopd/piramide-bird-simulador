package com.breixopd.piramidebird;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppContextTest {

    @Test
    public void applicationContextUsesPublishedApplicationId() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("com.breixopd.piramidebird", appContext.getPackageName());
    }

    @Test
    public void mainActivityDisplaysTheCapacitorWebView() {
        try (ActivityScenario<MainActivity> ignored = ActivityScenario.launch(MainActivity.class)) {
            ignored.onActivity(activity -> {
                WebView webView = activity.getBridge().getWebView();

                assertNotNull(webView);
                assertTrue(webView.isAttachedToWindow());
                assertTrue(webView.isShown());
            });
        }
    }

    @Test
    public void firebaseCollectionDefaultsRemainDisabled() throws PackageManager.NameNotFoundException {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ApplicationInfo applicationInfo = appContext
            .getPackageManager()
            .getApplicationInfo(appContext.getPackageName(), PackageManager.GET_META_DATA);

        assertFalse(applicationInfo.metaData.getBoolean("firebase_analytics_collection_enabled", true));
        assertFalse(applicationInfo.metaData.getBoolean("firebase_crashlytics_collection_enabled", true));
        assertFalse(applicationInfo.metaData.getBoolean("google_analytics_adid_collection_enabled", true));
    }
}
