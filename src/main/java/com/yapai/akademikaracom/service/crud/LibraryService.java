package com.yapai.akademikaracom.service.crud;

import com.yapai.akademikaracom.entity.Author;
import com.yapai.akademikaracom.entity.Institution;
import com.yapai.akademikaracom.entity.User;
import com.yapai.akademikaracom.entity.Work;
import com.yapai.akademikaracom.exception.ResourceAlreadyExistsException;
import com.yapai.akademikaracom.exception.ResourceNotFoundException;
import com.yapai.akademikaracom.repository.*;
import com.yapai.akademikaracom.request.AddAuthorRequest;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LibraryService {

    private final LibraryRepository libraryRepository;
    private final UserRepository userRepository;
    private final AuthorRepository authorRepository;
    private final WorkRepository workRepository;
    private final InstitutionRepository institutionRepository;

    public LibraryService(LibraryRepository libraryRepository,
                          UserRepository userRepository,
                          AuthorRepository authorRepository,
                          WorkRepository workRepository,
                          InstitutionRepository institutionRepository) {
        this.libraryRepository = libraryRepository;
        this.userRepository = userRepository;
        this.authorRepository = authorRepository;
        this.workRepository = workRepository;
        this.institutionRepository = institutionRepository;
    }

    //add author
    @Transactional
    public String addAuthorToLibrary(OAuth2User oAuth2User, AddAuthorRequest request) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        List<Author> authorList = user.getLibrary().getAuthorList();
        authorList.forEach(author -> {
            if (author.getOpenAlexId().equals(request.authorsOpenAlexID())) {
                throw new ResourceAlreadyExistsException("Bu yazar kitaplığınızda zaten kayıtlı");
            }
        });
        
        Author author = new Author();
        author.setOpenAlexId(request.authorsOpenAlexID());

        author = authorRepository.save(author);

        authorList.add(author);

        libraryRepository.save(user.getLibrary());
        
        return "author saved";
    }

    //get authors
    public List<Author> getAuthorsFromLibrary(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        return user.getLibrary().getAuthorList();
    }

    //delete authors
    @Transactional
    public void deleteAuthorFromLibrary(OAuth2User oAuth2User, String openAlexId) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        List<Author> authorList = user.getLibrary().getAuthorList();

        authorList.removeIf(author -> author.getOpenAlexId().equals(openAlexId));

        user.getLibrary().setAuthorList(authorList);

        libraryRepository.save(user.getLibrary());
    }

    //add work
    public String addWorkToLibrary(OAuth2User oAuth2User, String openAlexId) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        List<Work> workList = user.getLibrary().getWorkList();
        workList.forEach(work -> {
            if (work.getOpenAlexId().equals(openAlexId)) {
                throw new ResourceAlreadyExistsException("Makale zaten kayıtlı");
            }
        });

        Work work = new Work();
        work.setOpenAlexId(openAlexId);

        workRepository.save(work);

        workList.add(work);

        libraryRepository.save(user.getLibrary());

        return "work saved";
    }

    //get works
    public List<Work> getWorksFromLibrary(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        return user.getLibrary().getWorkList();
    }

    //delete work
    public void deleteWorkFromLibrary(OAuth2User oAuth2User, String openAlexId) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        List<Work> workList = user.getLibrary().getWorkList();

        workList.removeIf(work -> work.getOpenAlexId().equals(openAlexId));

        user.getLibrary().setWorkList(workList);

        libraryRepository.save(user.getLibrary());
    }

    //add institution
    public String addInstitutionToLibrary(OAuth2User oAuth2User, String openAlexId) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        List<Institution> institutionList = user.getLibrary().getInstitutionList();
        institutionList.forEach(institution -> {
            if (institution.getOpenAlexId().equals(openAlexId)) {
                throw new ResourceAlreadyExistsException("kurum zaten kayıtlı");
            }
        });

        Institution institution = new Institution();
        institution.setOpenAlexId(openAlexId);

        institutionRepository.save(institution);

        institutionList.add(institution);

        libraryRepository.save(user.getLibrary());

        return "institution saved";
    }

    //get institutions
    public List<Institution> getInstitutionsFromLibrary(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        return user.getLibrary().getInstitutionList();
    }

    //delete institution
    public void deleteInstitutionFromLibrary(OAuth2User oAuth2User, String openAlexId) {
        String email = oAuth2User.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(()-> new AuthenticationCredentialsNotFoundException("User not found"));

        List<Institution> institutionList = user.getLibrary().getInstitutionList();

        institutionList.removeIf(institution -> institution.getOpenAlexId().equals(openAlexId));

        user.getLibrary().setInstitutionList(institutionList);

        libraryRepository.save(user.getLibrary());
    }

}
