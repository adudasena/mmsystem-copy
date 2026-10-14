package com.adudasena.mmsystem;

import com.adudasena.mmsystem.config.CloudDatasource;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MmsystemApplication {

	public static void main(String[] args) {
		CloudDatasource.aplicarSeNecessario();
		SpringApplication.run(MmsystemApplication.class, args);
	}

}
