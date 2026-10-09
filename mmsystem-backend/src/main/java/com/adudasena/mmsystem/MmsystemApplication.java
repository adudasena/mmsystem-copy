package com.adudasena.mmsystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MmsystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(MmsystemApplication.class, args);
	}

}
