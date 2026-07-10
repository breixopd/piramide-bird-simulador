package com.breixopd.piramidebird;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class AppConfigurationTest {

    @Test
    public void packageNameMatchesPublishedApplicationId() {
        assertEquals("com.breixopd.piramidebird", AppConfigurationTest.class.getPackageName());
    }
}
